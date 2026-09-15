/**
 * Clave pública RSA (Resource/rsa_keys/public.pem del backend).
 *
 * `AuthController.Login` no recibe la contraseña en claro: hace
 * `Encryption.DecryptRSA(loginData.password)` con la clave PRIVADA. Por eso el
 * cliente debe cifrarla con la pública usando RSA-PKCS1-v1_5… en realidad
 * `RSACryptoServiceProvider.Decrypt(data, true)` == OAEP-SHA1, que es lo que
 * implementa `RsaCryptoService`.
 *
 * NO hay riesgo al publicar este valor: sólo sirve para cifrar, nunca para descifrar.
 * La clave privada jamás debe salir del servidor (y hoy está commiteada en el repo:
 * ver sección "Riesgos" del README).
 */
export const RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7Ehx9CzV7be38CKI6pG8
OoE63Hjya4AHBBaT3Goo9BZH/tvMRu1TSw7q8fhGWQk7lzb/57116AK6syytuT36
2H4gPu9Bad2tgYi9yUsd9sXQZcuQ2beLSA8PxVHJExqhiETDzDd6qQQrXvmMIUGE
mkjYz/Gafmf73dOemk48sIDt5F3p9uxCfC9qzS1dN6ljaTcEinuobwPOSXa6cRDq
/py6ai056LpGi9aJ14msXD3G01ZQex8LTUVmGPur1/oJbTe1wKbTqlQ4WxObpoZI
zZ+g+mAY4bJHcRh5VY/v+sIK/0gxuMv2q1RQZnTHGtZ9LZWjpIw+ymL1uf6W5IFW
xwIDAQAB
-----END PUBLIC KEY-----`;
