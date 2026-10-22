import prisma from '../db.js';

// 1. Δημιουργία Πελάτη / Εμπόρου
export const createCustomer = async (req, res) => {
  try {
    // Εκτύπωση για έλεγχο στο τερματικό
    console.log('REQ.USER Payload:', req.user);

    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Δεν βρέθηκε έγκυρο userId στο token σύνδεσης.' });
    }

    const { name, phone, vatNumber, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Το όνομα του πελάτη είναι υποχρεωτικό.' });
    }

    const customer = await prisma.customer.create({
      data: {
        userId,
        name,
        phone,
        vatNumber,
        notes
      }
    });

    res.status(201).json({
      message: 'Ο πελάτης δημιουργήθηκε επιτυχώς!',
      customer
    });
  } catch (error) {
    console.error('Σφάλμα στη δημιουργία πελάτη:', error);
    res.status(500).json({ error: error.message });
  }
};
// 2. Λήψη όλων των Πελατών του χρήστη (με καταμέτρηση των δελτίων τους)
export const getCustomers = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const customers = await prisma.customer.findMany({
      where: { userId },
      include: {
        _count: {
          select: { dispatches: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json(customers);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση πελατών:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στο server.' });
  }
};