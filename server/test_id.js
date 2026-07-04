const { init, lastInsertId } = require('./database');
init().then(() => {
    const id = lastInsertId();
    console.log("ID Type:", typeof id);
    console.log("ID Value:", id);
    try {
        console.log(JSON.stringify({ id }));
    } catch(e) {
        console.error("JSON Error:", e.message);
    }
}).catch(console.error);
