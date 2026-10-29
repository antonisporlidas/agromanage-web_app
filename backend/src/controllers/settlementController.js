import prisma from '../db.js';

// 1. Δημιουργία Εκκαθάρισης με αναλυτική διαλογή ανά καλλιέργεια
export const createSettlement = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { dispatchNoteId, items, notes } = req.body;

    if (!dispatchNoteId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Απαιτείται το dispatchNoteId και τουλάχιστον μία γραμμή τιμολόγησης (items).'
      });
    }

    // 1. Ανάκτηση δελτίου μαζί με όλες τις ΠΡΟΗΓΟΥΜΕΝΕΣ εκκαθαρίσεις του
    const dispatchNote = await prisma.dispatchNote.findFirst({
      where: {
        id: dispatchNoteId,
        harvestTasks: {
          some: { cropCycle: { field: { userId } } }
        }
      },
      include: {
        settlements: true,
        harvestTasks: { include: { cropCycle: true } }
      }
    });

    if (!dispatchNote) {
      return res.status(404).json({ error: 'Το δελτίο αποστολής δεν βρέθηκε.' });
    }

    if (dispatchNote.status === 'SETTLED') {
      return res.status(400).json({ error: 'Το δελτίο αποστολής έχει ήδη εκκαθαριστεί πλήρως.' });
    }

    // 2. Υπολογισμός ήδη εκκαθαρισμένων κιλών
    const alreadySettledKg = dispatchNote.settlements.reduce(
      (sum, s) => sum + s.totalQuantityKg,
      0
    );
    const remainingKg = dispatchNote.quantityKg - alreadySettledKg;

    // 3. Επικύρωση επιτρεπόμενων καλλιεργειών
    const validCropCycleIds = new Set(
      dispatchNote.harvestTasks.map((task) => task.cropCycleId)
    );

    let currentBatchKg = 0;
    let currentBatchAmount = 0;

    const formattedItems = items.map((item, index) => {
      const qty = parseFloat(item.quantityKg);
      const price = parseFloat(item.pricePerKg);

      if (!item.cropCycleId) {
        throw new Error(`Στη γραμμή ${index + 1} το πεδίο cropCycleId είναι υποχρεωτικό.`);
      }

      if (!validCropCycleIds.has(item.cropCycleId)) {
        throw new Error(`Η καλλιέργεια με ID ${item.cropCycleId} δεν περιλαμβάνεται στα μαζέματα αυτού του δελτίου.`);
      }

      if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
        throw new Error(`Στη γραμμή ${index + 1} τα κιλά και οι τιμές πρέπει να είναι έγκυροι θετικοί αριθμοί.`);
      }

      const subtotal = parseFloat((qty * price).toFixed(2));
      currentBatchKg += qty;
      currentBatchAmount += subtotal;

      return {
        cropCycleId: item.cropCycleId,
        grade: item.grade || 'Γενική',
        quantityKg: qty,
        pricePerKg: price,
        subtotal
      };
    });

    // 4. Έλεγχος υπέρβασης υπολοίπου κιλών
    if (currentBatchKg > remainingKg) {
      return res.status(400).json({
        error: `Τα κιλά της νέας εκκαθάρισης (${currentBatchKg} kg) υπερβαίνουν το διαθέσιμο υπόλοιπο του δελτίου (${remainingKg} kg από τα αρχικά ${dispatchNote.quantityKg} kg).`
      });
    }

    // 5. Καθορισμός νέου status δελτίου
    const isFullySettled = (alreadySettledKg + currentBatchKg) >= dispatchNote.quantityKg;
    const newStatus = isFullySettled ? 'SETTLED' : 'PARTIALLY_SETTLED';

    // 6. Prisma Transaction για ταυτόχρονη δημιουργία settlement & ενημέρωση status δελτίου
    const result = await prisma.$transaction(async (tx) => {
      const newSettlement = await tx.settlement.create({
        data: {
          dispatchNoteId,
          totalAmount: parseFloat(currentBatchAmount.toFixed(2)),
          totalQuantityKg: parseFloat(currentBatchKg.toFixed(2)),
          notes,
          items: {
            create: formattedItems
          }
        },
        include: {
          items: {
            include: {
              cropCycle: {
                select: {
                  cropType: true,
                  variety: true
                }
              }
            }
          }
        }
      });

      await tx.dispatchNote.update({
        where: { id: dispatchNoteId },
        data: { status: newStatus }
      });

      return newSettlement;
    });

    res.status(201).json({
      message: isFullySettled 
        ? 'Το δελτίο εκκαθαρίστηκε πλήρως!' 
        : `Καταχωρήθηκε μερική εκκαθάριση. Απομένουν ${remainingKg - currentBatchKg} kg προς τιμολόγηση.`,
      dispatchStatus: newStatus,
      settlement: result
    });

  } catch (error) {
    console.error('Σφάλμα στην εκκαθάριση:', error);
    res.status(400).json({ error: error.message || 'Κάτι πήγε στραβά.' });
  }
};

// 2. Ανάκτηση όλων των Εκκαθαρίσεων του συνδεδεμένου χρήστη
export const getSettlements = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const settlements = await prisma.settlement.findMany({
      where: {
        dispatchNote: {
          harvestTasks: {
            some: {
              cropCycle: {
                field: { userId }
              }
            }
          }
        }
      },
      include: {
        items: {
          include: {
            cropCycle: {
              select: {
                id: true,
                cropType: true,
                variety: true
              }
            }
          }
        },
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

// 3. Ανάκτηση μίας συγκεκριμένης Εκκαθάρισης με βάση το ID
export const getSettlementById = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const settlement = await prisma.settlement.findFirst({
      where: {
        id,
        dispatchNote: {
          harvestTasks: {
            some: {
              cropCycle: {
                field: { userId }
              }
            }
          }
        }
      },
      include: {
        items: {
          include: {
            cropCycle: {
              select: {
                id: true,
                cropType: true,
                variety: true
              }
            }
          }
        },
        dispatchNote: {
          include: {
            customer: true
          }
        }
      }
    });

    if (!settlement) {
      return res.status(404).json({ error: 'Η εκκαθάριση δεν βρέθηκε.' });
    }

    res.status(200).json(settlement);
  } catch (error) {
    console.error('Σφάλμα στην ανάκτηση εκκαθάρισης:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στον server.' });
  }
};

// 4. Διαγραφή Εκκαθάρισης (επαναφέρει το δελτίο σε κατάσταση προς εκκαθάριση)
export const deleteSettlement = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const settlement = await prisma.settlement.findFirst({
      where: {
        id,
        dispatchNote: {
          harvestTasks: {
            some: {
              cropCycle: {
                field: { userId }
              }
            }
          }
        }
      }
    });

    if (!settlement) {
      return res.status(404).json({ error: 'Η εκκαθάριση δεν βρέθηκε.' });
    }

    await prisma.settlement.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Η εκκαθάριση διαγράφηκε επιτυχώς.' });
  } catch (error) {
    console.error('Σφάλμα στη διαγραφή εκκαθάρισης:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά στον server.' });
  }
};