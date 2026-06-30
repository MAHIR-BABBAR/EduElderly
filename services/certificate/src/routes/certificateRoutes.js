const express = require('express');
const { extractUser } = require('@eduelderly/shared');
const {
  listMyCertificates,
  verifyCertificate,
  downloadCertificate,
} = require('../controllers/certificateController');

const router = express.Router();

router.get('/me', extractUser, listMyCertificates);
router.get('/me/:certId/download', extractUser, downloadCertificate);
router.get('/:certId/verify', verifyCertificate);

module.exports = router;
