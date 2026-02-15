const cron = require('node-cron');

const testCron = () => {
  // Schedule a task to run every minute
  cron.schedule('* * * * *', () => {
    console.log('Running a task every minute at:', new Date().toLocaleTimeString());
  });
}


module.exports = {
  testCron
}