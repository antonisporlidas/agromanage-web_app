import prisma from '../db.js';

// Βοηθητική συνάρτηση για εύρος ημερομηνιών βάσει έτους
const getYearDateRange = (yearInput) => {
  const year = parseInt(yearInput, 10) || new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
  return { year, startOfYear, endOfYear };
};

// 1. Επιστροφή όλων των διαθέσιμων ετών που έχουν καταχωρηθεί στις καλλιέργειες του χρήστη
export const getAvailableYears = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const distinctYears = await prisma.cropCycle.findMany({
      where: {
        field: { userId }
      },
      select: {
        year: true
      },
      distinct: ['year'],
      orderBy: {
        year: 'desc'
      }
    });

    const years = distinctYears.map((item) => item.year);

    res.status(200).json({
      years: years.length > 0 ? years : [new Date().getFullYear()]
    });
  } catch (error) {
    console.error('Σφάλμα στο getAvailableYears:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση των διαθέσιμων ετών.' });
  }
};

// 2. Συνολικός Απολογισμός Σεζόν / Έτους βάσει CropCycle.year
export const getDashboardOverview = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { year, startOfYear, endOfYear } = getYearDateRange(req.query.year);

    // Α. Συνολικά Έσοδα & Κιλά Εκκαθαρίσεων από καλλιέργειες αυτού του έτους
    const settlementsSummary = await prisma.settlementItem.aggregate({
      _sum: {
        quantityKg: true,
        subtotal: true
      },
      where: {
        cropCycle: {
          year,
          field: { userId }
        }
      }
    });

    const totalRevenue = settlementsSummary._sum.subtotal || 0;
    const totalSettledKg = settlementsSummary._sum.quantityKg || 0;
    const averagePricePerKg = totalSettledKg > 0 ? parseFloat((totalRevenue / totalSettledKg).toFixed(2)) : 0;

    // Β. Συνολικά Έξοδα συνδεδεμένα με τις καλλιέργειες αυτού του έτους ή γενικά έξοδα με date εντός του έτους
    const expensesSummary = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        OR: [
          { cropCycle: { year } },
          {
            cropCycleId: null,
            date: {
              gte: startOfYear,
              lte: endOfYear
            }
          }
        ]
      }
    });

    const totalExpenses = expensesSummary._sum.amount || 0;
    const netProfit = parseFloat((totalRevenue - totalExpenses).toFixed(2));
    const profitMarginPercent = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Γ. Συγκομιδές από καλλιέργειες αυτού του έτους
    const harvestSummary = await prisma.task.aggregate({
      _sum: { harvestQuantityKg: true },
      where: {
        taskType: 'HARVEST',
        status: 'COMPLETED',
        cropCycle: {
          year,
          field: { userId }
        }
      }
    });

    // Δ. Παραδόσεις δελτίων που περιείχαν σοδειά από καλλιέργειες αυτού του έτους
    const dispatches = await prisma.dispatchNote.findMany({
      where: {
        customer: { userId },
        harvestTasks: {
          some: {
            cropCycle: { year }
          }
        }
      },
      select: {
        quantityKg: true,
        status: true
      }
    });

    const totalDispatchedKg = dispatches.reduce((sum, d) => sum + d.quantityKg, 0);
    const pendingDispatchesCount = dispatches.filter((d) => d.status !== 'SETTLED').length;

    res.status(200).json({
      selectedYear: year,
      financials: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        netProfit,
        profitMarginPercent
      },
      production: {
        totalHarvestedKg: harvestSummary._sum.harvestQuantityKg || 0,
        totalDispatchedKg,
        totalSettledKg,
        averagePricePerKg,
        pendingDispatchesCount
      }
    });
  } catch (error) {
    console.error('Σφάλμα στο getDashboardOverview:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση του απολογισμού.' });
  }
};

// 3. Απολογισμός ανά Καλλιέργεια για το επιλεγμένο έτος (με αναλυτικά drill-down έσοδα/έξοδα)
export const getCropPerformance = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { year } = getYearDateRange(req.query.year);

    const cropCycles = await prisma.cropCycle.findMany({
      where: {
        field: { userId },
        year
      },
      include: {
        field: { select: { id: true, name: true } },
        tasks: {
          where: { taskType: 'HARVEST', status: 'COMPLETED' },
          select: {
            id: true,
            harvestQuantityKg: true,
            completedAt: true,
            notes: true
          }
        },
        settlementItems: {
          include: {
            settlement: {
              select: {
                id: true,
                settledAt: true,
                dispatchNote: {
                  select: {
                    dispatchNumber: true,
                    customer: { select: { name: true } }
                  }
                }
              }
            }
          }
        },
        expenses: {
          select: {
            id: true,
            title: true,
            category: true,
            amount: true,
            date: true,
            notes: true
          },
          orderBy: { date: 'asc' }
        }
      }
    });

    const report = cropCycles.map((crop) => {
      const harvestedKg = crop.tasks.reduce((sum, t) => sum + (t.harvestQuantityKg || 0), 0);
      const settledKg = crop.settlementItems.reduce((sum, item) => sum + item.quantityKg, 0);
      const totalRevenue = crop.settlementItems.reduce((sum, item) => sum + item.subtotal, 0);
      const avgPrice = settledKg > 0 ? parseFloat((totalRevenue / settledKg).toFixed(2)) : 0;

      const totalExpenses = crop.expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const netProfit = parseFloat((totalRevenue - totalExpenses).toFixed(2));
      const costPerHarvestedKg = harvestedKg > 0 ? parseFloat((totalExpenses / harvestedKg).toFixed(2)) : 0;

      const gradesBreakdown = {};
      const revenueDetails = crop.settlementItems.map((item) => {
        const gradeKey = item.grade || 'Γενική';
        if (!gradesBreakdown[gradeKey]) {
          gradesBreakdown[gradeKey] = { quantityKg: 0, revenue: 0 };
        }
        gradesBreakdown[gradeKey].quantityKg += item.quantityKg;
        gradesBreakdown[gradeKey].revenue += item.subtotal;

        return {
          id: item.id,
          settledAt: item.settlement.settledAt,
          dispatchNumber: item.settlement.dispatchNote.dispatchNumber,
          customerName: item.settlement.dispatchNote.customer.name,
          grade: item.grade,
          quantityKg: item.quantityKg,
          pricePerKg: item.pricePerKg,
          subtotal: item.subtotal
        };
      });

      return {
        cropCycleId: crop.id,
        cropType: crop.cropType,
        variety: crop.variety,
        fieldName: crop.field.name,
        year: crop.year,
        financials: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          netProfit,
          costPerHarvestedKg,
          avgSellingPricePerKg: avgPrice
        },
        quantities: {
          harvestedKg,
          settledKg,
          unsettledKg: Math.max(0, harvestedKg - settledKg)
        },
        gradesSummary: gradesBreakdown,
        details: {
          revenues: revenueDetails,
          expenses: crop.expenses
        }
      };
    });

    res.status(200).json({
      selectedYear: year,
      cropsCount: report.length,
      crops: report
    });
  } catch (error) {
    console.error('Σφάλμα στο getCropPerformance:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά τον απολογισμό καλλιεργειών.' });
  }
};

// 4. Οικονομική Καρτέλα Πελατών για τις καλλιέργειες του επιλεγμένου έτους
export const getCustomerSummary = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { year } = getYearDateRange(req.query.year);

    const customers = await prisma.customer.findMany({
      where: { userId },
      include: {
        dispatches: {
          where: {
            harvestTasks: {
              some: {
                cropCycle: { year }
              }
            }
          },
          include: {
            settlements: {
              include: {
                items: {
                  where: {
                    cropCycle: { year }
                  }
                }
              }
            }
          }
        }
      }
    });

    const summary = customers
      .filter((c) => c.dispatches.length > 0)
      .map((c) => {
        let totalDispatchedKg = 0;
        let totalSettledKg = 0;
        let totalRevenue = 0;
        let pendingDispatches = 0;

        c.dispatches.forEach((dn) => {
          totalDispatchedKg += dn.quantityKg;
          if (dn.status !== 'SETTLED') {
            pendingDispatches += 1;
          }

          dn.settlements.forEach((s) => {
            s.items.forEach((item) => {
              totalSettledKg += item.quantityKg;
              totalRevenue += item.subtotal;
            });
          });
        });

        return {
          customerId: c.id,
          customerName: c.name,
          phone: c.phone,
          totalDispatchedKg,
          totalSettledKg,
          pendingKg: Math.max(0, totalDispatchedKg - totalSettledKg),
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          pendingDispatchesCount: pendingDispatches
        };
      });

    res.status(200).json({
      selectedYear: year,
      customers: summary
    });
  } catch (error) {
    console.error('Σφάλμα στο getCustomerSummary:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάλυση πελατών.' });
  }
};