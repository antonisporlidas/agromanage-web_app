import prisma from '../db.js';
// 1. Δημιουργία νέου καλλιεργητικού κύκλου
export const createCropCycle = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { fieldId, cropType, variety, year, startDate, endDate, isActive } = req.body;

    if (!fieldId || !cropType || !startDate) {
      return res.status(400).json({ error: 'Τα πεδία fieldId, cropType και startDate είναι υποχρεωτικά.' });
    }

    // Έλεγχος ότι το χωράφι ανήκει όντως στον συνδεδεμένο χρήστη
    const field = await prisma.field.findFirst({
      where: { id: fieldId, userId: userId }
    });

    if (!field) {
      return res.status(404).json({ error: 'Το αγροτεμάχιο δεν βρέθηκε ή δεν έχετε πρόσβαση.' });
    }

    const newCropCycle = await prisma.cropCycle.create({
  data: {
    fieldId,
    cropType,
    variety,
    year: year ? parseInt(year) : new Date(startDate).getFullYear(),
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : null,
    isActive: isActive !== undefined ? isActive : false // Πάντα false από προεπιλογή
  }
});

    res.status(201).json({
      message: 'Ο καλλιεργητικός κύκλος δημιουργήθηκε επιτυχώς!',
      cropCycle: newCropCycle
    });
  } catch (error) {
    console.error('Σφάλμα στη δημιουργία καλλιεργητικού κύκλου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 2. Λήψη όλων των καλλιεργητικών κύκλων του χρήστη (με προαιρετικά filters: year, fieldId)
export const getCropCycles = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { year, fieldId, isActive } = req.query;

    const filters = {
      field: {
        userId: userId // Data isolation: Μόνο κύκλοι σε χωράφια του χρήστη
      }
    };

    if (year) {
      filters.year = parseInt(year);
    }

    if (fieldId) {
      filters.fieldId = fieldId;
    }

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const cropCycles = await prisma.cropCycle.findMany({
      where: filters,
      include: {
        field: {
          select: { name: true, areaInStremma: true, location: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    res.status(200).json(cropCycles);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση καλλιεργητικών κύκλων:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 3. Λήψη ενός συγκεκριμένου καλλιεργητικού κύκλου με ID (περιλαμβάνει και έξοδα / δελτία)
export const getCropCycleById = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const cropCycle = await prisma.cropCycle.findFirst({
      where: {
        id,
        field: { userId }
      },
      include: {
        field: true,
        tasks: true,
        expenses: true,
        dispatches: {
          include: { settlement: true }
        }
      }
    });

    if (!cropCycle) {
      return res.status(404).json({ error: 'Ο καλλιεργητικός κύκλος δεν βρέθηκε.' });
    }

    res.status(200).json(cropCycle);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση στοιχείων κύκλου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 4. Ενημέρωση καλλιεργητικού κύκλου
export const updateCropCycle = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { cropType, variety, year, startDate, endDate, isActive } = req.body;

    const existingCycle = await prisma.cropCycle.findFirst({
      where: {
        id,
        field: { userId }
      }
    });

    if (!existingCycle) {
      return res.status(404).json({ error: 'Ο καλλιεργητικός κύκλος δεν βρέθηκε.' });
    }

    const updatedCycle = await prisma.cropCycle.update({
      where: { id },
      data: {
        cropType: cropType ?? existingCycle.cropType,
        variety: variety ?? existingCycle.variety,
        year: year ? parseInt(year) : existingCycle.year,
        startDate: startDate ? new Date(startDate) : existingCycle.startDate,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : existingCycle.endDate,
        isActive: isActive !== undefined ? isActive : existingCycle.isActive
      }
    });

    res.status(200).json({
      message: 'Ο καλλιεργητικός κύκλος ενημερώθηκε επιτυχώς!',
      cropCycle: updatedCycle
    });
  } catch (error) {
    console.error('Σφάλμα στην ενημέρωση καλλιεργητικού κύκλου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 5. Διαγραφή καλλιεργητικού κύκλου
export const deleteCropCycle = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const existingCycle = await prisma.cropCycle.findFirst({
      where: {
        id,
        field: { userId }
      }
    });

    if (!existingCycle) {
      return res.status(404).json({ error: 'Ο καλλιεργητικός κύκλος δεν βρέθηκε.' });
    }

    await prisma.cropCycle.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Ο καλλιεργητικός κύκλος διαγράφηκε επιτυχώς.' });
  } catch (error) {
    console.error('Σφάλμα στη διαγραφή κύκλου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};