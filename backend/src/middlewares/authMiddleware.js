import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  const token = authHeader && authHeader.split(' ')[1]; //για να παρουμε την μορφη του token χωρισ τον τυπο εξουσιοδοτησησ

  if (!token) {
    return res.status(401).json({ error: 'Δεν δόθηκε token πιστοποίησης.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Μη έγκυρο ή ληγμένο token.' });
    }

    req.user = user;
    next();
  });
};