"use strict";
module.exports = function(io){
  const router = express.Router();
  router.get('/', function (req, res, next) {
    res.sendFile(path.resolve('app/views/admin.html'));
  });
  return router;
}

