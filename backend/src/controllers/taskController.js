import prisma from '../db.js';

export const createTask = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      cropCycleId,
      taskType,
      title,
      status,
      dueDate,
      notes,
      productName,
      quantityApplied,
      dosageUnit,
      harvestQuantityKg,
      qualityGrade
    } = req.body;

    if (!cropCycleId || !taskType) {
      return res.status(400).json({ error: 'Τα πεδία cropCycleId και taskType είναι υποχρεωτικά.' });
    }

    const validTaskTypes = ['PLANTING', 'FERTILIZATION', 'SPRAYING', 'HARVEST', 'SHREDDING'];
    if (!validTaskTypes.includes(taskType)) {
      return res.status(400).json({ error: `Μη έγκυρος τύπος εργασίας. Επιλογές: ${validTaskTypes.join(', ')}` });
    }

    // Έλεγχος δικαιώματος πρόσβασης στον καλλιεργητικό κύκλο
    const cropCycle = await prisma.cropCycle.findFirst({
      where: {
        id: cropCycleId,
        field: { userId }
      }
    });

    if (!cropCycle) {
      return res.status(404).json({ error: 'Ο καλλιεργητικός κύκλος δεν βρέθηκε.' });
    }

    // Κανόνας: Αν η καλλιέργεια είναι ανενεργή, επιτρέπεται ΜΟΝΟ η Φύτευση (PLANTING)
    if (!cropCycle.isActive && taskType !== 'PLANTING') {
      return res.status(400).json({
        error: 'Η καλλιέργεια είναι ανενεργή. Πρέπει πρώτα να καταχωρηθεί Φύτευση (PLANTING) για να ενεργοποιηθεί.'
      });
    }

    // Validation πεδίων ανάλογα με τον τύπο εργασίας
    if ((taskType === 'FERTILIZATION' || taskType === 'SPRAYING') && (!productName || quantityApplied === undefined)) {
      return res.status(400).json({
        error: 'Για εργασία Λίπανσης ή Ψεκασμού απαιτείται το όνομα προϊόντος (productName) και η ποσότητα (quantityApplied).'
      });
    }

    if (taskType === 'HARVEST' && (!harvestQuantityKg || !qualityGrade)) {
      return res.status(400).json({
        error: 'Για τη Συγκομιδή απαιτούνται τα κιλά (harvestQuantityKg) και η κατηγορία (qualityGrade: GRADE_A ή GRADE_B).'
      });
    }

    // Δημιουργία της εργασίας
    const newTask = await prisma.task.create({
      data: {
        cropCycleId,
        taskType,
        title: title || taskType,
        status: status || 'PENDING',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        productName: (taskType === 'FERTILIZATION' || taskType === 'SPRAYING') ? productName : null,
        quantityApplied: (taskType === 'FERTILIZATION' || taskType === 'SPRAYING') ? parseFloat(quantityApplied) : null,
        dosageUnit: (taskType === 'FERTILIZATION' || taskType === 'SPRAYING') ? dosageUnit : null,
        harvestQuantityKg: taskType === 'HARVEST' ? parseFloat(harvestQuantityKg) : null,
        qualityGrade: taskType === 'HARVEST' ? qualityGrade : null
      }
    });

    // Αυτόματη ενεργοποίηση του κύκλου μόλις γίνει Φύτευση
    if (taskType === 'PLANTING') {
      await prisma.cropCycle.update({
        where: { id: cropCycleId },
        data: {
          isActive: true,
          startDate: dueDate ? new Date(dueDate) : new Date()
        }
      });
    }

    // Αυτόματη απενεργοποίηση (κλείσιμο σεζόν) αν καταχωρηθεί Καταστροφέας ως COMPLETED
    if (taskType === 'SHREDDING' && status === 'COMPLETED') {
      await prisma.cropCycle.update({
        where: { id: cropCycleId },
        data: {
          isActive: false,
          endDate: new Date()
        }
      });
    }

    res.status(201).json({
      message: 'Η εργασία καταχωρήθηκε επιτυχώς!',
      task: newTask
    });
  } catch (error) {
    console.error('Σφάλμα στη δημιουργία εργασίας:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

export const getTasks = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { cropCycleId, taskType, status } = req.query;

    const filters = {
      cropCycle: {
        field: { userId }
      }
    };

    if (cropCycleId) filters.cropCycleId = cropCycleId;
    if (taskType) filters.taskType = taskType;
    if (status) filters.status = status;

    const tasks = await prisma.task.findMany({
      where: filters,
      include: {
        cropCycle: {
          select: {
            cropType: true,
            variety: true,
            isActive: true,
            field: { select: { name: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση εργασιών:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

export const updateTask = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const {
      title,
      status,
      dueDate,
      notes,
      productName,
      quantityApplied,
      dosageUnit,
      harvestQuantityKg,
      qualityGrade
    } = req.body;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        cropCycle: { field: { userId } }
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title ?? existingTask.title,
        status: status ?? existingTask.status,
        dueDate: dueDate ? new Date(dueDate) : existingTask.dueDate,
        notes: notes ?? existingTask.notes,
        productName: productName ?? existingTask.productName,
        quantityApplied: quantityApplied !== undefined ? parseFloat(quantityApplied) : existingTask.quantityApplied,
        dosageUnit: dosageUnit ?? existingTask.dosageUnit,
        harvestQuantityKg: harvestQuantityKg !== undefined ? parseFloat(harvestQuantityKg) : existingTask.harvestQuantityKg,
        qualityGrade: qualityGrade ?? existingTask.qualityGrade,
        completedAt: status === 'COMPLETED' && !existingTask.completedAt ? new Date() : existingTask.completedAt
      }
    });

    // Αν ολοκληρώθηκε ο Καταστροφέας εκ των υστέρων μέσω update, κλείνει οριστικά ο κύκλος
    if (existingTask.taskType === 'SHREDDING' && status === 'COMPLETED') {
      await prisma.cropCycle.update({
        where: { id: existingTask.cropCycleId },
        data: {
          isActive: false,
          endDate: new Date()
        }
      });
    }

    res.status(200).json({
      message: 'Η εργασία ενημερώθηκε επιτυχώς!',
      task: updatedTask
    });
  } catch (error) {
    console.error('Σφάλμα στην ενημέρωση εργασίας:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        cropCycle: { field: { userId } }
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Η εργασία δεν βρέθηκε.' });
    }

    await prisma.task.delete({ where: { id } });
    res.status(200).json({ message: 'Η εργασία διαγράφηκε επιτυχώς.' });
  } catch (error) {
    console.error('Σφάλμα στη διαγραφή εργασίας:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};