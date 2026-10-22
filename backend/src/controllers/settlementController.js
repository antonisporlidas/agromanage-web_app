import prisma from '../db.js';

export const createSettlement = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { dispatchNoteId, items, notes } = req.body;

    // items παράδειγμα:
    // [
    //   { "grade": "Α Διαλογή", "quantityKg": 80, "pricePerKg": 1.00 },
    //   { "grade": "Β Διαλογή", "quantityKg": 20, "pricePerKg": 1.20 },
    //   { "grade": "Χυμός", "quantityKg": 300, "pricePerKg": 0.35 }
    // ]

    if (!dispatchNoteId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Απαιτείται το dispatchNoteId και τουλάχιστον μία γραμμή τιμολόγησης (items).'
      });
    }

    // 1. Έλεγχος ύπαρξης και ιδιοκτησίας του δελτίου
    const dispatchNote = await prisma.dispatchNote.findFirst({
      where: {
        id: dispatchNoteId,
        cropCycle: {
          field: { userId }
        }
      },
      include: { settlement: true }
    });

    if (!dispatchNote) {
      return res.status(404).json({ error: 'Το δελτίο αποστολής δεν βρέθηκε.' });
    }

    if (dispatchNote.settlement) {
      return res.status(400).json({ error: 'Έχει ήδη εκδοθεί εκκαθάριση για αυτό το δελτίο.' });
    }

    // 2. Υπολογισμοί και επικύρωση κιλών
    let totalSettledKg = 0;
    let totalAmount = 0;

    const formattedItems = items.map((item) => {
      const qty = parseFloat(item.quantityKg);
      const price = parseFloat(item.pricePerKg);

      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        throw new Error('Όλα τα κιλά και οι τιμές πρέπει να είναι έγκυροι θετικοί αριθμοί.');
      }

      const subtotal = parseFloat((qty * price).toFixed(2));
      totalSettledKg += qty;
      totalAmount += subtotal;

      return {
        grade: item.grade || 'Γενική',
        quantityKg: qty,
        pricePerKg: price,
        subtotal
      };
    });

    // Έλεγχος: Τα τιμολογημένα κιλά δεν μπορούν να υπερβαίνουν τα κιλά του δελτίου
    if (totalSettledKg > dispatchNote.quantityKg) {
      return res.status(400).json({
        error: `Τα συνολικά τιμολογημένα κιλά (${totalSettledKg} kg) υπερβαίνουν τα κιλά του δελτίου αποστολής (${dispatchNote.quantityKg} kg).`
      });
    }

    // 3. Ατομική αποθήκευση Εκκαθάρισης και Γραμμών (Nested Write στο Prisma)
    const settlement = await prisma.settlement.create({
      data: {
        dispatchNoteId,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        totalQuantityKg: parseFloat(totalSettledKg.toFixed(2)),
        notes,
        items: {
          create: formattedItems
        }
      },
      include: {
        items: true,
        dispatchNote: {
          include: {
            customer: { select: { name: true } }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Η εκκαθάριση καταχωρήθηκε επιτυχώς με αναλυτική διαλογή!',
      settlement
    });
  } catch (error) {
    console.error('Σφάλμα στην καταχώρηση εκκαθάρισης:', error);
    res.status(400).json({ error: error.message || 'Κάτι πήγε στραβά.' });
  }
};
// 2. Ανάκτηση όλων των Εκκαθαρίσεων
export const getSettlements = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const settlements = await prisma.settlement.findMany({
      where: {
        dispatchNote: {
          cropCycle: {
            field: { userId }
          }
        }
      },
      include: {
        dispatchNote: {
          select: {
            id: true,
            dispatchNumber: true,
            quantityKg: true,
            deliveryDate: true,
            customer: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { settledAt: 'desc' }
    });

    res.status(200).json(settlements);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση εκκαθαρίσεων:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στον server.' });
  }
};