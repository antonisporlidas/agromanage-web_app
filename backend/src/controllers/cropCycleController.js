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

// Διαγραφή Καλλιέργειας
export const deleteCropCycle = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const cropCycle = await prisma.cropCycle.findFirst({
      where: {
        id,
        field: { userId }
      },
      include: {
        settlementItems: true,
        tasks: {
          where: { dispatchNoteId: { not: null } }
        }
      }
    });

    if (!cropCycle) {
      return res.status(404).json({ error: 'Η καλλιέργεια δεν βρέθηκε.' });
    }

    // Έλεγχος αν υπάρχουν εκκαθαρίσεις
    if (cropCycle.settlementItems.length > 0) {
      return res.status(400).json({
        error: 'Αδύνατη η διαγραφή: Η καλλιέργεια έχει ήδη τιμολογηθεί σε εκκαθαρίσεις.'
      });
    }

    // Έλεγχος αν υπάρχουν δελτία αποστολής
    if (cropCycle.tasks.length > 0) {
      return res.status(400).json({
        error: 'Αδύνατη η διαγραφή: Η σοδειά της καλλιέργειας έχει ήδη φορτωθεί σε δελτία αποστολής.'
      });
    }

    await prisma.cropCycle.delete({ where: { id } });

    res.status(200).json({ message: 'Η καλλιέργεια διαγράφηκε επιτυχώς.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Σφάλμα κατά τη διαγραφή.' });
  }
};

// Επεξεργασία Καλλιέργειας (Κλείδωμα βασικών στοιχείων αν έχει γίνει εκκαθάριση)
export const updateCropCycle = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { cropType, variety, fieldId, notes, isActive, endDate } = req.body;

    const cropCycle = await prisma.cropCycle.findFirst({
      where: { id, field: { userId } },
      include: { settlementItems: true }
    });

    if (!cropCycle) {
      return res.status(404).json({ error: 'Η καλλιέργεια δεν βρέθηκε.' });
    }

    const hasSettlements = cropCycle.settlementItems.length > 0;

    // Αν έχει γίνει εκκαθάριση, απαγορεύεται η αλλαγή του είδους, της ποικιλίας και του χωραφιού
    if (hasSettlements) {
      if ((cropType && cropType !== cropCycle.cropType) || 
          (variety && variety !== cropCycle.variety) || 
          (fieldId && fieldId !== cropCycle.fieldId)) {
        return res.status(400).json({
          error: 'Δεν μπορείτε να αλλάξετε είδος, ποικιλία ή χωράφι σε καλλιέργεια που έχει εκκαθαριστεί.'
        });
      }
    }

    const updated = await prisma.cropCycle.update({
      where: { id },
      data: {
        cropType: hasSettlements ? undefined : cropType,
        variety: hasSettlements ? undefined : variety,
        fieldId: hasSettlements ? undefined : fieldId,
        notes,
        isActive,
        endDate: endDate ? new Date(endDate) : undefined
      }
    });

    res.status(200).json({
      message: 'Η καλλιέργεια ενημερώθηκε επιτυχώς.',
      cropCycle: updated
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Σφάλμα κατά την ενημέρωση.' });
  }
};