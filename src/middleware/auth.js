const authMiddleware = (tokenService, validator) => (req, res, next) => {
  const authToken = req.cookies['auth-token'];
  if (!authToken) {
    return res.status(401).end();
  }

  const [payload, verifyErr] = tokenService.verify(authToken);
  if (verifyErr) {
    return res.status(401).json(verifyErr);
  }

  const validateError = validator(req, payload);
  if (validateError) {
    return res.status(403).json(validateError);
  }

  req.ctx = {};
  req.ctx['userid'] = payload.userid;

  next();
};

const loggedInMiddleware = (tokenService) => {
  return authMiddleware(tokenService, () => null);
};

const ownerMiddleware = (tokenService, useridparam) => {
  return authMiddleware(tokenService, (req, payload) => {
    const userid = parseInt(req.params[useridparam], 10);
    if (!userid || userid !== payload.userid) {
      return {code: 0, message: 'Not allowed to access the resource'};
    }
    return null;
  });
};

module.exports = {
  authMiddleware,
  loggedInMiddleware,
  ownerMiddleware,
};
