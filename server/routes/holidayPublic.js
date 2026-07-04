
const { Router } = require('express');
const db = require('../database');

const router = Router();

router.get('/', (req, res) => {
  try {
    const rows = db.query('SELECT * FROM holiday_public ORDER BY dateHoliday DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const rows = db.query('SELECT * FROM holiday_public WHERE id = ?', [+req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jour férié introuvable.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { dateHoliday, label = '', fkUser = null, typePeriode = 'JOURNEE_ENTIERE' } = req.body;
    if (!dateHoliday) return res.status(400).json({ error: 'dateHoliday est obligatoire.' });

    const fkUserVal = fkUser ? parseInt(fkUser) : null;

    db.run(
      'INSERT INTO holiday_public (dateHoliday, label, fkUser, typePeriode) VALUES (?, ?, ?, ?)',
      [dateHoliday, label, fkUserVal, typePeriode]
    );

    const id = db.lastInsertId();
    res.status(201).json({ id, dateHoliday, label, fkUser: fkUserVal, typePeriode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = +req.params.id;
    const rows = db.query('SELECT * FROM holiday_public WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jour férié introuvable.' });

    const existing = rows[0];
    const { dateHoliday, label, fkUser, typePeriode } = req.body;

    const updated = {
      id,
      dateHoliday:  dateHoliday  ?? existing.dateHoliday,
      label:        label        ?? existing.label,
      fkUser:       fkUser !== undefined ? (fkUser ? parseInt(fkUser) : null) : existing.fkUser,
      typePeriode:  typePeriode  ?? existing.typePeriode,
    };

    db.run(
      'UPDATE holiday_public SET dateHoliday = ?, label = ?, fkUser = ?, typePeriode = ? WHERE id = ?',
      [updated.dateHoliday, updated.label, updated.fkUser, updated.typePeriode, id]
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = +req.params.id;
    const rows = db.query('SELECT * FROM holiday_public WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Jour férié introuvable.' });

    db.run('DELETE FROM holiday_public WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
