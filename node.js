const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3054;

// 1. Création automatique du dossier 'uploads' s'il n'existe pas
const uploadDir = path.join('/var/www/html/', 'uploads');

//const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Middlewares
app.use(cors()); // Autorise les requêtes cross-origin
app.use(express.static(path.join(__dirname, 'public'))); // Sert le fichier index.html
app.use('/uploads', express.static(uploadDir)); // Permet de consulter les fichiers uploadés

// 3. Configuration du stockage Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nettoie le nom du fichier et ajoute un timestamp pour éviter les doublons
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

// Limite de taille fixée à 50 Mo
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// 4. Endpoint API REST : POST /api/upload
// Le nom du champ 'file' correspond à formData.append('file', selectedFile) côté client
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Aucun fichier n’a été reçu par le serveur.'
    });
  }

  // Réponse JSON renvoyée au client
  res.status(200).json({
    success: true,
    message: 'Fichier transféré avec succès.',
    file: {
      originalName: req.file.originalname,
      savedName: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `http://localhost:${PORT}/uploads/${req.file.filename}`
    }
  });
});

// 5. Gestion globale des erreurs (ex: fichier trop volumineux)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Le fichier dépasse la limite autorisée de 50 Mo.'
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
});

// 6. Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  console.log(`Endpoint d'upload prêt sur POST http://localhost:${PORT}/api/upload`);
});