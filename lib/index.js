"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs = require("fs-extra");
var path = require("path");
var GithubApi = require("@octokit/rest");
var child_process_1 = require("child_process");
var CONFIG_JSON = path.join(__dirname, "..", "config.json");
var REPOS_DIR = path.join(__dirname, "..", "repos");
function git(params, cwd) {
    return new Promise(function (resolve, reject) {
        child_process_1.exec("git " + params, { cwd: cwd }, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }
            else {
                console.log(stderr);
                resolve(stdout);
            }
        });
    });
}
function sync(config) {
    return __awaiter(this, void 0, void 0, function () {
        var gh, excludes, repos, page, result, _loop_1, _i, repos_1, repo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    gh = new GithubApi(Object.assign({}, config.source));
                    excludes = config.excludes;
                    if (excludes == null) {
                        excludes = [];
                    }
                    gh.authenticate(config.auth);
                    repos = [];
                    page = 0;
                    _a.label = 1;
                case 1: return [4 /*yield*/, gh.repos.getAll({ page: page })];
                case 2:
                    result = _a.sent();
                    repos.push.apply(repos, result.data);
                    if (result.headers.link == null) {
                        return [3 /*break*/, 4];
                    }
                    _a.label = 3;
                case 3:
                    ++page;
                    return [3 /*break*/, 1];
                case 4:
                    _loop_1 = function (repo) {
                        var name, full_name, owner, ssh_url, base_dir, repo_dir;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    name = repo.name, full_name = repo.full_name, owner = repo.owner, ssh_url = repo.ssh_url;
                                    if (excludes.indexOf(full_name) >= 0) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    if (ssh_url == null) {
                                        if (config.ssh_url == null) {
                                            throw new Error("No SSH URL for " + full_name);
                                        }
                                        ssh_url = config.ssh_url.replace(/\{(host|owner|repo)\}/g, function (_match, key) {
                                            switch (key) {
                                                case "host":
                                                    return config.source.host;
                                                case "owner":
                                                    return owner.login;
                                                case "repo":
                                                    return name;
                                            }
                                            return "{" + key + "}";
                                        });
                                    }
                                    ssh_url = ssh_url.replace(/^(git@.*):([^:\/]+)\//, function (_all, server, owner) {
                                        return "ssh://" + server + "/" + owner + "/";
                                    });
                                    base_dir = path.join(REPOS_DIR, owner.login);
                                    repo_dir = path.join(base_dir, name + ".git");
                                    return [4 /*yield*/, fs.ensureDir(base_dir)];
                                case 1:
                                    _b.sent();
                                    if (!fs.existsSync(repo_dir)) return [3 /*break*/, 4];
                                    // Already cloned
                                    console.log("* Updating a repository: " + full_name);
                                    return [4 /*yield*/, git("remote set-url origin \"" + ssh_url + "\"", repo_dir)];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, git("fetch --all", repo_dir)];
                                case 3:
                                    _b.sent();
                                    return [3 /*break*/, 6];
                                case 4:
                                    // Newly clone
                                    console.log("* Cloning a new repository: " + full_name);
                                    return [4 /*yield*/, git("clone --mirror \"" + ssh_url + "\"", base_dir)];
                                case 5:
                                    _b.sent();
                                    _b.label = 6;
                                case 6: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, repos_1 = repos;
                    _a.label = 5;
                case 5:
                    if (!(_i < repos_1.length)) return [3 /*break*/, 8];
                    repo = repos_1[_i];
                    return [5 /*yield**/, _loop_1(repo)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8: return [2 /*return*/];
            }
        });
    });
}
sync(JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8")))["catch"](function (reason) {
    console.error(reason);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map