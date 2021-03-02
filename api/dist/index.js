"use strict";

require("core-js/modules/es.array.join.js");

require("core-js/modules/es.date.to-string.js");

require("core-js/modules/es.object.to-string.js");

require("core-js/modules/es.promise.js");

require("core-js/modules/es.regexp.to-string.js");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.get = exports.create = void 0;

require("regenerator-runtime/runtime.js");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _index = require("../../../helper/api/dist/index.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var WALLET_PATH = _path["default"].join(__dirname, '..', '..', '..', '..', 'wallet');
/**
 * Creates an identity on the network.
 * Each indentity is unique (uniqueHash).
 * A user can choose to override his identity.
 */


var create = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(_ref) {
    var encryptedIdentity, uniqueHash, _ref$override, override, user;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            encryptedIdentity = _ref.encryptedIdentity, uniqueHash = _ref.uniqueHash, _ref$override = _ref.override, override = _ref$override === void 0 ? 'false' : _ref$override, user = _ref.user;
            return _context2.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(resolve, reject) {
                var walletPath, _yield$getContractAnd, contract, gateway, response;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context.next = 4;
                        return (0, _index.getContractAndGateway)({
                          user: user,
                          chaincode: 'identity',
                          contract: 'Identity'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd = _context.sent;
                        contract = _yield$getContractAnd.contract;
                        gateway = _yield$getContractAnd.gateway;

                        if (!(!contract || !gateway)) {
                          _context.next = 9;
                          break;
                        }

                        return _context.abrupt("return");

                      case 9:
                        _context.next = 11;
                        return contract.submitTransaction('createIdentity', encryptedIdentity, uniqueHash, override)["catch"](reject);

                      case 11:
                        response = _context.sent;
                        _context.next = 14;
                        return gateway.disconnect();

                      case 14:
                        if (response) {
                          _context.next = 16;
                          break;
                        }

                        return _context.abrupt("return");

                      case 16:
                        resolve();
                        return _context.abrupt("return");

                      case 18:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x2, _x3) {
                return _ref3.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function create(_x) {
    return _ref2.apply(this, arguments);
  };
}();
/**
 * Retrieves an identity from the network.
 */


exports.create = create;

var get = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(_ref4) {
    var user, identityId;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            user = _ref4.user, identityId = _ref4.identityId;
            return _context4.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(resolve, reject) {
                var walletPath, _yield$getContractAnd2, contract, gateway, response, identity;

                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context3.next = 4;
                        return (0, _index.getContractAndGateway)({
                          user: user,
                          chaincode: 'identity',
                          contract: 'Identity'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd2 = _context3.sent;
                        contract = _yield$getContractAnd2.contract;
                        gateway = _yield$getContractAnd2.gateway;

                        if (!(!contract || !gateway)) {
                          _context3.next = 9;
                          break;
                        }

                        return _context3.abrupt("return");

                      case 9:
                        if (!identityId) {
                          _context3.next = 15;
                          break;
                        }

                        _context3.next = 12;
                        return contract.submitTransaction('getIdentity', identityId)["catch"](reject);

                      case 12:
                        _context3.t0 = _context3.sent;
                        _context3.next = 18;
                        break;

                      case 15:
                        _context3.next = 17;
                        return contract.submitTransaction('getIdentity')["catch"](reject);

                      case 17:
                        _context3.t0 = _context3.sent;

                      case 18:
                        response = _context3.t0;
                        _context3.next = 21;
                        return gateway.disconnect();

                      case 21:
                        if (response) {
                          _context3.next = 23;
                          break;
                        }

                        return _context3.abrupt("return");

                      case 23:
                        identity = JSON.parse(response.toString('utf8'));
                        resolve(identity);
                        return _context3.abrupt("return");

                      case 26:
                      case "end":
                        return _context3.stop();
                    }
                  }
                }, _callee3);
              }));

              return function (_x5, _x6) {
                return _ref6.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));

  return function get(_x4) {
    return _ref5.apply(this, arguments);
  };
}();

exports.get = get;