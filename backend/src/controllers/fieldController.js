import prisma from '../db.js';

// 1. Δημιουργία νέου αγροτεμαχίου
export const createField = async (req, res) => {
  try {
    // Παίρνουμε τα σωστά πεδία σύμφωνα με το Prisma schema
    const { name, areaInStremma, location, soilType } = req.body;

    // Έλεγχος υποχρεωτικών πεδίων (name και areaInStremma)
    if (!name || areaInStremma === undefined || areaInStremma === null) {
      return res.status(400).json({
        error: 'Το όνομα και η έκταση σε στρέμματα (areaInStremma) είναι υποχρεωτικά.',
      });
    }

    // Παίρνουμε το id του συνδεδεμένου χρήστη από το JWT middleware
    const userId = req.user.userId || req.user.id;

    // Αποθήκευση στη βάση δεδομένων
    const newField = await prisma.field.create({
      data: {
        name: name,
        areaInStremma: parseFloat(areaInStremma), // Μετατροπή σε δεκαδικό αριθμό
        location: location || null,
        soilType: soilType || null,
        userId: userId,
      },
    });

    res.status(201).json({
      message: 'Το αγροτεμάχιο δημιουργήθηκε με επιτυχία!',
      field: newField,
    });
  } catch (error) {
    console.error('Σφάλμα στη δημιουργία αγροτεμαχίου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 2. Λήψη όλων των αγροτεμαχίων του συνδεδεμένου χρήστη
export const getMyFields = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const fields = await prisma.field.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      count: fields.length,
      fields: fields,
    });
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση αγροτεμαχίων:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 3. Ανάκτηση ενός συγκεκριμένου αγροτεμαχίου βάσει ID
export const getFieldById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    // Ψάχνουμε το χωράφι που ταιριάζει και στο id ΚΑΙ στον χρήστη
    const field = await prisma.field.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!field) {
      return res.status(404).json({ error: 'Το αγροτεμάχιο δεν βρέθηκε.' });
    }

    res.status(200).json(field);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση αγροτεμαχίου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 4. Ενημέρωση στοιχείων αγροτεμαχίου (PUT)
export const updateField = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;
    const { name, areaInStremma, location, soilType } = req.body;

    // Ελέγχουμε πρώτα αν το χωράφι υπάρχει και ανήκει στον χρήστη
    const existingField = await prisma.field.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Το αγροτεμάχιο δεν βρέθηκε.' });
    }

    // Ενημερώνουμε μόνο τα πεδία που έστειλε ο χρήστης
    const updatedField = await prisma.field.update({
      where: { id: id },
      data: {
        name: name !== undefined ? name : existingField.name,
        areaInStremma: areaInStremma !== undefined ? parseFloat(areaInStremma) : existingField.areaInStremma,
        location: location !== undefined ? location : existingField.location,
        soilType: soilType !== undefined ? soilType : existingField.soilType,
      },
    });

    res.status(200).json({
      message: 'Το αγροτεμάχιο ενημερώθηκε επιτυχώς!',
      field: updatedField,
    });
  } catch (error) {
    console.error('Σφάλμα στην ενημέρωση αγροτεμαχίου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};

// 5. Διαγραφή αγροτεμαχίου (DELETE)
export const deleteField = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId || req.user.id;

    // Έλεγχος ύπαρξης και ιδιοκτησίας
    const existingField = await prisma.field.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Το αγροτεμάχιο δεν βρέθηκε.' });
    }

    // Διαγραφή από τη βάση
    await prisma.field.delete({
      where: { id: id },
    });

    res.status(200).json({ message: 'Το αγροτεμάχιο διαγράφηκε επιτυχώς.' });
  } catch (error) {
    console.error('Σφάλμα στη διαγραφή αγροτεμαχίου:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};