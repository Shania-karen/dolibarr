const axios = require('axios');

axios.get('http://localhost:8080/dolibarr/api/index.php/salaries/payments?limit=10', {
  headers: { 'DOLAPIKEY': 'a31031ec9f9fac9ae7d484c24a4b8cf78a5a8aaf' }
})
.then(res => {
  console.log('STATUS:', res.status);
  console.log('DATA:', res.data);
})
.catch(err => {
  console.error('ERROR:', err.message);
  if (err.response) {
    console.error('RESPONSE DATA:', err.response.data);
  }
});
