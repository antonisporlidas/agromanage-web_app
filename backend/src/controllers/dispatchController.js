import prisma from '../db.js';

// 1. Ανάκτηση όλων των διαθέσιμων (μη απεσταλμένων) συγκομιδών
export const getAvailableHarvests = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { cropCycleId } = req.query;

    const filters = {
      taskType: 'HARVEST',
      status: 'COMPLETED',
      dispatchNoteId: null, // <--- ΕΔΩ: Μόνο όσα ΔΕΝ έχουν συνδεθεί με δελτίο
      cropCycle: {
        field: { userId }
      }
    };

    if (cropCycleId) {
      filters.cropCycleId = cropCycleId;
    }

    const availableHarvests = await prisma.task.findMany({
      where: filters,
      select: {
        id: true,
        completedAt: true,
        harvestQuantityKg: true,
        qualityGrade: true,
        notes: true,
        cropCycle: {
          select: {
            id: true,
            cropType: true,
            variety: true,
            field: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    });

    res.status(200).json(availableHarvests);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση διαθέσιμων συγκομιδών:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 2. Λήψη Δελτίων Αποστολής (Πιο πρόσφατα πρώτα, προαιρετικό φίλτρο customerId)
export const getDispatchNotes = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { customerId, cropCycleId } = req.query;

    const filters = {
      cropCycle: {
        field: { userId }
      }
    };

    if (customerId) {
      filters.customerId = customerId;
    }

    if (cropCycleId) {
      filters.cropCycleId = cropCycleId;
    }

    const dispatches = await prisma.dispatchNote.findMany({
      where: filters,
      include: {
        customer: {
          select: { id: true, name: true, phone: true }
        },
        cropCycle: {
          select: {
            cropType: true,
            variety: true,
            field: { select: { name: true } }
          }
        },
        harvestTasks: {
          select: {
            id: true,
            harvestQuantityKg: true,
            qualityGrade: true,
            completedAt: true
          }
        },
        settlement: true
      },
      orderBy: { deliveryDate: 'desc' }
    });

    res.status(200).json(dispatches);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση δελτίων αποστολής:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 3. Δημιουργία Δελτίου Αποστολής με customerId και επιλεγμένες συγκομιδές
export const createDispatchNote = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const {
      cropCycleId,
      customerId,
      dispatchNumber,
      deliveryDate,
      notes,
      harvestTaskIds
    } = req.body;

    if (!customerId || !dispatchNumber || !harvestTaskIds || !Array.isArray(harvestTaskIds) || harvestTaskIds.length === 0) {
      return res.status(400).json({
        error: 'Απαιτούνται customerId, dispatchNumber και τουλάχιστον ένα επιλεγμένο task συγκομιδής.'
      });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Ο πελάτης δεν βρέθηκε.' });
    }

    const cropCycle = await prisma.cropCycle.findFirst({
      where: { id: cropCycleId, field: { userId } }
    });

    if (!cropCycle) {
      return res.status(404).json({ error: 'Ο καλλιεργητικός κύκλος δεν βρέθηκε.' });
    }

    const selectedHarvests = await prisma.task.findMany({
      where: {
        id: { in: harvestTaskIds },
        cropCycleId,
        taskType: 'HARVEST',
        status: 'COMPLETED',
        dispatchNoteId: null
      }
    });

    if (selectedHarvests.length !== harvestTaskIds.length) {
      return res.status(400).json({
        error: 'Μία ή περισσότερες συγκομιδές δεν είναι διαθέσιμες.'
      });
    }

    const totalQuantityKg = selectedHarvests.reduce((sum, task) => sum + (task.harvestQuantityKg || 0), 0);

    const result = await prisma.$transaction(async (tx) => {
      const newDispatch = await tx.dispatchNote.create({
        data: {
          cropCycleId,
          customerId,
          dispatchNumber,
          quantityKg: totalQuantityKg,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
          notes
        }
      });

      await tx.task.updateMany({
        where: { id: { in: harvestTaskIds } },
        data: { dispatchNoteId: newDispatch.id }
      });

      return newDispatch;
    });

    res.status(201).json({
      message: 'Το δελτίο αποστολής εκδόθηκε επιτυχώς!',
      dispatchNote: result,
      totalQuantityKg
    });
  } catch (error) {
    console.error('Σφάλμα στη δημιουργία δελτίου αποστολής:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};