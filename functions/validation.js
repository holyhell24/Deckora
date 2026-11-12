const USERNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;
const NICKNAME_PATTERN = /^[A-Za-z0-9]{3,15}$/;

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_PATTERN.test(username);
}

function isValidNickname(nickname) {
  return typeof nickname === 'string' && NICKNAME_PATTERN.test(nickname);
}

function isValidPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 1 &&
    password.length <= 128
  );
}

module.exports = { isValidUsername, isValidNickname, isValidPassword };
