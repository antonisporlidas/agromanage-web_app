import prisma from '../db.js';

// 1. Καταχώρηση νέου εξόδου
export const createExpense = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    // Δεχόμαστε είτε "date" είτε "expenseDate" από το body για ασφάλεια
    const { title, category, amount, date, expenseDate, cropCycleId, fieldId, notes, year } = req.body;

    if (!title || amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Ο τίτλος και ένα θετικό ποσό είναι υποχρεωτικά.' });
    }

    let determinedYear = year ? parseInt(year, 10) : null;

    // Αν συνδέεται με καλλιέργεια, επιβεβαιώνουμε ότι ανήκει στον χρήστη και παίρνουμε το έτος της
    if (cropCycleId) {
      const cropCycle = await prisma.cropCycle.findFirst({
        where: {
          id: cropCycleId,
          field: { userId }
        }
      });

      if (!cropCycle) {
        return res.status(404).json({ error: 'Η επιλεγμένη καλλιέργεια δεν βρέθηκε.' });
      }

      if (!determinedYear) {
        determinedYear = cropCycle.year;
      }
    }

    // Αν συνδέεται με χωράφι, επιβεβαιώνουμε ότι ανήκει στον χρήστη
    if (fieldId) {
      const field = await prisma.field.findFirst({
        where: { id: fieldId, userId }
      });

      if (!field) {
        return res.status(404).json({ error: 'Το επιλεγμένο χωράφι δεν βρέθηκε.' });
      }
    }

    const inputDate = date || expenseDate;
    const finalDate = inputDate ? new Date(inputDate) : new Date();

    if (!determinedYear) {
      determinedYear = finalDate.getFullYear();
    }

    const expense = await prisma.expense.create({
      data: {
        userId,
        title: title.trim(),
        category: category || 'OTHER',
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        date: finalDate, // Σωστό πεδίο schema
        year: determinedYear,
        cropCycleId: cropCycleId || null,
        fieldId: fieldId || null,
        notes: notes ? notes.trim() : null
      },
      include: {
        cropCycle: {
          select: {
            id: true,
            cropType: true,
            variety: true,
            year: true
          }
        },
        field: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Το έξοδο καταχωρήθηκε επιτυχώς!',
      expense
    });
  } catch (error) {
    console.error('Σφάλμα στο createExpense:', error);
    res.status(500).json({ error: error.message || 'Κάτι πήγε στραβά κατά την καταχώρηση.' });
  }
};

// 2. Ανάκτηση όλων των εξόδων του χρήστη (με φίλτρα)
export const getExpenses = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { cropCycleId, fieldId, category, year } = req.query;

    const filters = { userId };

    if (cropCycleId) {
      filters.cropCycleId = cropCycleId;
    }

    if (fieldId) {
      filters.fieldId = fieldId;
    }

    if (category) {
      filters.category = category;
    }

    if (year) {
      const targetYear = parseInt(year, 10);
      filters.OR = [
        { year: targetYear },
        { cropCycle: { year: targetYear } },
        {
          cropCycleId: null,
          date: {
            gte: new Date(`${targetYear}-01-01T00:00:00.000Z`),
            lte: new Date(`${targetYear}-12-31T23:59:59.999Z`)
          }
        }
      ];
    }

    const expenses = await prisma.expense.findMany({
      where: filters,
      include: {
        cropCycle: {
          select: {
            id: true,
            cropType: true,
            variety: true,
            year: true
          }
        },
        field: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json(expenses);
  } catch (error) {
    console.error('Σφάλμα στο getExpenses:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση των εξόδων.' });
  }
};

// 3. Ανάκτηση συγκεκριμένου εξόδου βάσει ID
export const getExpenseById = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id, userId },
      include: {
        cropCycle: {
          select: {
            id: true,
            cropType: true,
            variety: true,
            year: true
          }
        },
        field: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Το έξοδο δεν βρέθηκε.' });
    }

    res.status(200).json(expense);
  } catch (error) {
    console.error('Σφάλμα στο getExpenseById:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση του εξόδου.' });
  }
};

// 4. Ενημέρωση εξόδου
export const updateExpense = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { title, category, amount, date, expenseDate, cropCycleId, fieldId, notes, year } = req.body;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Το έξοδο δεν βρέθηκε.' });
    }

    let determinedYear = year !== undefined ? parseInt(year, 10) : undefined;

    if (cropCycleId) {
      const cropCycle = await prisma.cropCycle.findFirst({
        where: { id: cropCycleId, field: { userId } }
      });
      if (!cropCycle) {
        return res.status(404).json({ error: 'Η επιλεγμένη καλλιέργεια δεν βρέθηκε.' });
      }
      if (determinedYear === undefined) {
        determinedYear = cropCycle.year;
      }
    }

    if (fieldId) {
      const field = await prisma.field.findFirst({
        where: { id: fieldId, userId }
      });
      if (!field) {
        return res.status(404).json({ error: 'Το επιλεγμένο χωράφι δεν βρέθηκε.' });
      }
    }

    const inputDate = date || expenseDate;

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        category: category !== undefined ? category : undefined,
        amount: amount !== undefined ? parseFloat(parseFloat(amount).toFixed(2)) : undefined,
        date: inputDate ? new Date(inputDate) : undefined,
        year: determinedYear,
        cropCycleId: cropCycleId !== undefined ? cropCycleId : undefined,
        fieldId: fieldId !== undefined ? fieldId : undefined,
        notes: notes !== undefined ? notes : undefined
      },
      include: {
        cropCycle: {
          select: {
            id: true,
            cropType: true,
            variety: true,
            year: true
          }
        },
        field: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(200).json({
      message: 'Το έξοδο ενημερώθηκε επιτυχώς!',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Σφάλμα στο updateExpense:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ενημέρωση.' });
  }
};

// 5. Διαγραφή εξόδου
export const deleteExpense = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const expense = await prisma.expense.findFirst({
      where: { id, userId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Το έξοδο δεν βρέθηκε.' });
    }

    await prisma.expense.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Το έξοδο διαγράφηκε επιτυχώς.' });
  } catch (error) {
    console.error('Σφάλμα στο deleteExpense:', error);
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή του εξόδου.' });
  }
};