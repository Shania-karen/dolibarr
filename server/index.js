
const express = require('express');
const cors    = require('cors');
const db      = require('./database');

const app  = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

app.use('/api/holidayPublic', require('./routes/holidayPublic'));

db.init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(` Serveur Express démarré → http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error(' Impossible d\'initialiser la base SQLite :', err);
    process.exit(1);
  });
