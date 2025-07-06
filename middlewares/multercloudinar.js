const multer = require('multer');
const path = require('path');

module.exports = multer({
  storage:multer.diskStorage({}),
  fileFilter:(req,file,cb)=>{
    let ext = path.extname(file.originalname);
    if(ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".webp" && ext !== ".svg"){
      cb(new Error("erreur de type de fichier"),false);
      return ;
    }
    cb(null,true)
  }
}).single("image");
