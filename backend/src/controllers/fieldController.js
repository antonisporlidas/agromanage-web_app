import prisma from '../db.js';

// 1. Δημιουργία Χωραφιού (με συντεταγμένες χάρτη)
export const createField = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { name, location, areaInStremma, latitude, longitude, notes } = req.body;

    if (!name || areaInStremma === undefined || isNaN(parseFloat(areaInStremma)) || parseFloat(areaInStremma) <= 0) {
      return res.status(400).json({ error: 'Το όνομα και μια έγκυρη έκταση σε στρέμματα είναι υποχρεωτικά.' });
    }

    const field = await prisma.field.create({
      data: {
        userId,
        name: name.trim(),
        location: location ? location.trim() : null,
        areaInStremma: parseFloat(areaInStremma),
        latitude: latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null,
        notes: notes ? notes.trim() : null
      }
    });

    res.status(201).json({
      message: 'Το χωράφι δημιουργήθηκε επιτυχώς!',
      field
    });
  } catch (error) {
    console.error('Σφάλμα στο createField:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά τη δημιουργία του χωραφιού.' });
  }
};

// 2. Ανάκτηση όλων των χωραφιών του χρήστη
export const getMyFields = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const fields = await prisma.field.findMany({
      where: { userId },
      include: {
        cropCycles: {
          orderBy: { year: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(fields);
  } catch (error) {
    console.error('Σφάλμα στο getFields:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση των χωραφιών.' });
  }
};

// 3. Ανάκτηση συγκεκριμένου χωραφιού
export const getFieldById = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const field = await prisma.field.findFirst({
      where: { id, userId },
      include: {
        cropCycles: {
          orderBy: { year: 'desc' }
        },
        expenses: {
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!field) {
      return res.status(404).json({ error: 'Το χωράφι δεν βρέθηκε.' });
    }

    res.status(200).json(field);
  } catch (error) {
    console.error('Σφάλμα στο getFieldById:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση του χωραφιού.' });
  }
};

// 4. Ενημέρωση χωραφιού (και συντεταγμένων)
export const updateField = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;
    const { name, location, areaInStremma, latitude, longitude, notes } = req.body;

    const existingField = await prisma.field.findFirst({
      where: { id, userId }
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Το χωράφι δεν βρέθηκε.' });
    }

    const updatedField = await prisma.field.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        location: location !== undefined ? location : undefined,
        areaInStremma: areaInStremma !== undefined ? parseFloat(areaInStremma) : undefined,
        latitude: latitude !== undefined ? (latitude === null || latitude === '' ? null : parseFloat(latitude)) : undefined,
        longitude: longitude !== undefined ? (longitude === null || longitude === '' ? null : parseFloat(longitude)) : undefined,
        notes: notes !== undefined ? notes : undefined
      }
    });

    res.status(200).json({
      message: 'Το χωράφι ενημερώθηκε επιτυχώς!',
      field: updatedField
    });
  } catch (error) {
    console.error('Σφάλμα στο updateField:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ενημέρωση του χωραφιού.' });
  }
};

// 5. Διαγραφή χωραφιού
export const deleteField = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const existingField = await prisma.field.findFirst({
      where: { id, userId },
      include: { cropCycles: true }
    });

    if (!existingField) {
      return res.status(404).json({ error: 'Το χωράφι δεν βρέθηκε.' });
    }

    if (existingField.cropCycles.length > 0) {
      return res.status(400).json({
        error: 'Δεν μπορείτε να διαγράψετε χωράφι που έχει συνδεδεμένες καλλιέργειες.'
      });
    }

    await prisma.field.delete({ where: { id } });

    res.status(200).json({ message: 'Το χωράφι διαγράφηκε επιτυχώς.' });
  } catch (error) {
    console.error('Σφάλμα στο deleteField:', error);
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή του χωραφιού.' });
  }
};

// 6. Καιρός & Αγροτικές Συμβουλές Χωραφιού (μέσω OpenWeather API)
export const getFieldWeather = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { id } = req.params;

    const field = await prisma.field.findFirst({
      where: { id, userId }
    });

    if (!field) {
      return res.status(404).json({ error: 'Το χωράφι δεν βρέθηκε.' });
    }

    if (field.latitude === null || field.longitude === null) {
      return res.status(400).json({
        error: 'Δεν έχουν οριστεί συντεταγμένες (latitude, longitude) για αυτό το χωράφι.'
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Λείπει το OPENWEATHER_API_KEY από το αρχείο .env του server.'
      });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${field.latitude}&lon=${field.longitude}&units=metric&lang=el&appid=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Σφάλμα κατά την επικοινωνία με το OpenWeather API.'
      });
    }

    // Μετατροπή ανέμου από m/s σε km/h για εύκολη ανάγνωση από τον αγρότη
    const windSpeedKmh = parseFloat(((data.wind?.speed || 0) * 3.6).toFixed(1));
    const temp = data.main?.temp || 0;
    const humidity = data.main?.humidity || 0;
    const isRaining = data.weather?.some((w) => w.main === 'Rain' || w.main === 'Thunderstorm' || w.main === 'Drizzle');

    // Έξυπνη αγροτική συμβουλή βάσει συνθηκών
    let farmingAdvice = 'Κατάλληλες συνθήκες για εργασίες στο χωράφι.';
    if (isRaining) {
      farmingAdvice = 'Αποφύγετε τον ψεκασμό και τη λίπανση λόγω βροχόπτωσης.';
    } else if (windSpeedKmh > 20) {
      farmingAdvice = 'Ισχυρός άνεμος (>20 km/h) - Ακατάλληλες συνθήκες για ψεκασμό.';
    } else if (temp > 34) {
      farmingAdvice = 'Υψηλή θερμοκρασία - Προτιμήστε πότισμα ή εργασίες νωρίς το πρωί ή αργά το απόγευμα.';
    }

    res.status(200).json({
      fieldId: field.id,
      fieldName: field.name,
      coordinates: {
        latitude: field.latitude,
        longitude: field.longitude
      },
      weather: {
        temperature: temp,
        feelsLike: data.main?.feels_like,
        humidity,
        windSpeedKmh,
        description: data.weather?.[0]?.description || '',
        icon: data.weather?.[0]?.icon || ''
      },
      farmingAdvice
    });
  } catch (error) {
    console.error('Σφάλμα στο getFieldWeather:', error);
    res.status(500).json({ error: 'Κάτι πήγε στραβά κατά την ανάκτηση του καιρού.' });
  }
};