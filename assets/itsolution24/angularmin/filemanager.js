(function(angular) {
    'use strict';
    // var app = angular.module('FileManagerApp');
    var app = angular.module('angularApp');

    app.directive('angularFilemanager', ['$parse', 'fileManagerConfig', function($parse, fileManagerConfig) {
        return {
            restrict: 'EA',
            templateUrl: fileManagerConfig.tplPath + '/main.html'
        };
    }]);

    app.directive('ngFile', ['$parse', function($parse) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var model = $parse(attrs.ngFile);
                var modelSetter = model.assign;

                element.bind('change', function() {
                    scope.$apply(function() {
                        modelSetter(scope, element[0].files);
                    });
                });
            }
        };
    }]);

    app.directive('ngRightClick', ['$parse', function($parse) {
        return function(scope, element, attrs) {
            var fn = $parse(attrs.ngRightClick);
            element.bind('contextmenu', function(event) {
                scope.$apply(function() {
                    event.preventDefault();
                    fn(scope, {$event: event});
                });
            });
        };
    }]);
    
})(angular);

(function(angular) {
    'use strict';
    // var app = angular.module('FileManagerApp');
    var app = angular.module('angularApp');

    app.filter('strLimit', ['$filter', function($filter) {
        return function(input, limit, more) {
            if (input.length <= limit) {
                return input;
            }
            return $filter('limitTo')(input, limit) + (more || '...');
        };
    }]);

    app.filter('fileExtension', ['$filter', function($filter) {
        return function(input) {
            return /\./.test(input) && $filter('strLimit')(input.split('.').pop(), 3, '..') || '';
        };
    }]);

    app.filter('formatDate', ['$filter', function() {
        return function(input) {
            return input instanceof Date ?
                input.toISOString().substring(0, 19).replace('T', ' ') :
                (input.toLocaleString || input.toString).apply(input);
        };
    }]);

    app.filter('humanReadableFileSize', ['$filter', 'fileManagerConfig', function($filter, fileManagerConfig) {
      // See https://en.wikipedia.org/wiki/Binary_prefix
      var decimalByteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
      var binaryByteUnits = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

      return function(input) {
        var i = -1;
        var fileSizeInBytes = input;

        do {
          fileSizeInBytes = fileSizeInBytes / 1024;
          i++;
        } while (fileSizeInBytes > 1024);

        var result = fileManagerConfig.useBinarySizePrefixes ? binaryByteUnits[i] : decimalByteUnits[i];
        return Math.max(fileSizeInBytes, 0.1).toFixed(1) + ' ' + result;
      };
    }]);
})(angular);

(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').provider('fileManagerConfig', function() {
    angular.module('angularApp').provider('fileManagerConfig', function() {

        var values = {
            appName: 'pos-filemanager v1.5',
            defaultLang: 'en',
            multiLang: true,

            listUrl: 'bridges/php/handler.php',
            uploadUrl: 'bridges/php/handler.php',
            renameUrl: 'bridges/php/handler.php',
            copyUrl: 'bridges/php/handler.php',
            moveUrl: 'bridges/php/handler.php',
            removeUrl: 'bridges/php/handler.php',
            editUrl: 'bridges/php/handler.php',
            getContentUrl: 'bridges/php/handler.php',
            createFolderUrl: 'bridges/php/handler.php',
            downloadFileUrl: 'bridges/php/handler.php',
            downloadMultipleUrl: 'bridges/php/handler.php',
            compressUrl: 'bridges/php/handler.php',
            extractUrl: 'bridges/php/handler.php',
            permissionsUrl: 'bridges/php/handler.php',
            basePath: '/',

            searchForm: true,
            sidebar: true,
            breadcrumb: true,
            allowedActions: {
                upload: true,
                rename: true,
                move: true,
                copy: true,
                edit: true,
                changePermissions: true,
                compress: true,
                compressChooseName: true,
                extract: true,
                download: true,
                downloadMultiple: true,
                preview: true,
                remove: true,
                createFolder: true,
                pickFiles: false,
                pickFolders: false
            },

            multipleDownloadFileName: 'pos-filemanager.zip',
            filterFileExtensions: [],
            showExtensionIcons: true,
            showSizeForDirectories: false,
            useBinarySizePrefixes: false,
            downloadFilesByAjax: true,
            previewImagesInModal: true,
            enablePermissionsRecursive: true,
            compressAsync: false,
            extractAsync: false,
            pickCallback: null,

            isEditableFilePattern: /\.(txt|diff?|patch|svg|asc|cnf|cfg|conf|html?|.html|cfm|cgi|aspx?|ini|pl|py|md|css|cs|js|jsp|log|htaccess|htpasswd|gitignore|gitattributes|env|json|atom|eml|rss|markdown|sql|xml|xslt?|sh|rb|as|bat|cmd|cob|for|ftn|frm|frx|inc|lisp|scm|coffee|php[3-6]?|java|c|cbl|go|h|scala|vb|tmpl|lock|go|yml|yaml|tsv|lst)$/i,
            isImageFilePattern: /\.(jpe?g|gif|bmp|png|svg|tiff?)$/i,
            isExtractableFilePattern: /\.(gz|tar|rar|g?zip)$/i,
            tplPath: 'src/templates'
        };

        return {
            $get: function() {
                return values;
            },
            set: function (constants) {
                angular.extend(values, constants);
            }
        };

    });
})(angular);

(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').service('chmod', function () {
    angular.module('angularApp').service('chmod', function () {

        var Chmod = function(initValue) {
            this.owner = this.getRwxObj();
            this.group = this.getRwxObj();
            this.others = this.getRwxObj();

            if (initValue) {
                var codes = isNaN(initValue) ?
                    this.convertfromCode(initValue):
                    this.convertfromOctal(initValue);

                if (! codes) {
                    throw new Error('Invalid chmod input data (%s)'.replace('%s', initValue));
                }

                this.owner = codes.owner;
                this.group = codes.group;
                this.others = codes.others;
            }
        };

        Chmod.prototype.toOctal = function(prepend, append) {
            var result = [];
            ['owner', 'group', 'others'].forEach(function(key, i) {
                result[i]  = this[key].read  && this.octalValues.read  || 0;
                result[i] += this[key].write && this.octalValues.write || 0;
                result[i] += this[key].exec  && this.octalValues.exec  || 0;
            }.bind(this));
            return (prepend||'') + result.join('') + (append||'');
        };

        Chmod.prototype.toCode = function(prepend, append) {
            var result = [];
            ['owner', 'group', 'others'].forEach(function(key, i) {
                result[i]  = this[key].read  && this.codeValues.read  || '-';
                result[i] += this[key].write && this.codeValues.write || '-';
                result[i] += this[key].exec  && this.codeValues.exec  || '-';
            }.bind(this));
            return (prepend||'') + result.join('') + (append||'');
        };

        Chmod.prototype.getRwxObj = function() {
            return {
                read: false,
                write: false,
                exec: false
            };
        };

        Chmod.prototype.octalValues = {
            read: 4, write: 2, exec: 1
        };

        Chmod.prototype.codeValues = {
            read: 'r', write: 'w', exec: 'x'
        };

        Chmod.prototype.convertfromCode = function (str) {
            str = ('' + str).replace(/\s/g, '');
            str = str.length === 10 ? str.substr(1) : str;
            if (! /^[-rwxts]{9}$/.test(str)) {
                return;
            }

            var result = [], vals = str.match(/.{1,3}/g);
            for (var i in vals) {
                var rwxObj = this.getRwxObj();
                rwxObj.read  = /r/.test(vals[i]);
                rwxObj.write = /w/.test(vals[i]);
                rwxObj.exec  = /x|t/.test(vals[i]);
                result.push(rwxObj);
            }

            return {
                owner : result[0],
                group : result[1],
                others: result[2]
            };
        };

        Chmod.prototype.convertfromOctal = function (str) {
            str = ('' + str).replace(/\s/g, '');
            str = str.length === 4 ? str.substr(1) : str;
            if (! /^[0-7]{3}$/.test(str)) {
                return;
            }

            var result = [], vals = str.match(/.{1}/g);
            for (var i in vals) {
                var rwxObj = this.getRwxObj();
                rwxObj.read  = /[4567]/.test(vals[i]);
                rwxObj.write = /[2367]/.test(vals[i]);
                rwxObj.exec  = /[1357]/.test(vals[i]);
                result.push(rwxObj);
            }

            return {
                owner : result[0],
                group : result[1],
                others: result[2]
            };
        };

        return Chmod;
    });
})(angular);
(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').factory('item', ['fileManagerConfig', 'chmod', function(fileManagerConfig, Chmod) {
    angular.module('angularApp').factory('item', ['fileManagerConfig', 'chmod', function(fileManagerConfig, Chmod) {

        var Item = function(model, path) {
            var rawModel = {
                name: model && model.name || '',
                path: path || [],
                type: model && model.type || 'file',
                size: model && parseInt(model.size || 0),
                date: parseMySQLDate(model && model.date),
                perms: new Chmod(model && model.rights),
                content: model && model.content || '',
                recursive: false,
                fullPath: function() {
                    var path = this.path.filter(Boolean);
                    return ('/' + path.join('/') + '/' + this.name).replace(/\/\//, '/');
                }
            };

            this.error = '';
            this.processing = false;

            this.model = angular.copy(rawModel);
            this.tempModel = angular.copy(rawModel);

            function parseMySQLDate(mysqlDate) {
                var d = (mysqlDate || '').toString().split(/[- :]/);
                return new Date(d[0], d[1] - 1, d[2], d[3], d[4], d[5]);
            }
        };

        Item.prototype.update = function() {
            angular.extend(this.model, angular.copy(this.tempModel));
        };

        Item.prototype.revert = function() {
            angular.extend(this.tempModel, angular.copy(this.model));
            this.error = '';
        };

        Item.prototype.isFolder = function() {
            return this.model.type === 'dir';
        };

        Item.prototype.isEditable = function() {
            return !this.isFolder() && fileManagerConfig.isEditableFilePattern.test(this.model.name);
        };

        Item.prototype.isImage = function() {
            return fileManagerConfig.isImageFilePattern.test(this.model.name);
        };

        Item.prototype.isCompressible = function() {
            return this.isFolder();
        };

        Item.prototype.isExtractable = function() {
            return !this.isFolder() && fileManagerConfig.isExtractableFilePattern.test(this.model.name);
        };

        Item.prototype.isSelectable = function() {
            return (this.isFolder() && fileManagerConfig.allowedActions.pickFolders) || (!this.isFolder() && fileManagerConfig.allowedActions.pickFiles);
        };

        return Item;
    }]);
})(angular);
(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').service('apiHandler', ['$http', '$q', '$window', '$translate', '$httpParamSerializer', 'Upload',
    angular.module('angularApp').service('apiHandler', ['$http', '$q', '$window', '$translate', '$httpParamSerializer', 'Upload',
        function ($http, $q, $window, $translate, $httpParamSerializer, Upload) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var ApiHandler = function() {
            this.inprocess = false;
            this.asyncSuccess = false;
            this.error = '';
        };

        ApiHandler.prototype.deferredHandler = function(data, deferred, code, defaultMsg) {
            if (!data || typeof data !== 'object') {
                this.error = 'Error %s - Bridge response error, please check the API docs or this ajax response.'.replace('%s', code);
            }
            if (code == 404) {
                this.error = 'Error 404 - Backend bridge is not working, please check the ajax response.';
            }
            if (data.result && data.result.error) {
                this.error = data.result.error;
            }
            if (!this.error && data.error) {
                this.error = data.error.message;
            }
            if (!this.error && defaultMsg) {
                this.error = defaultMsg;
            }
            if (this.error) {
                return deferred.reject(data);
            }
            return deferred.resolve(data);
        };

        ApiHandler.prototype.list = function(apiUrl, path, customDeferredHandler, exts) {
            var self = this;
            var dfHandler = customDeferredHandler || self.deferredHandler;
            var deferred = $q.defer();
            var data = {
                action: 'list',
                path: path,
                fileExtensions: exts && exts.length ? exts : undefined
            };

            self.inprocess = true;
            self.error = '';

            $http.post(apiUrl, data).then(function(response) {
                dfHandler(response.data, deferred, response.status);
            }, function(response) {
                dfHandler(response.data, deferred, response.status, 'Unknown error listing, check the response');
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.copy = function(apiUrl, items, path, singleFilename) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'copy',
                items: items,
                newPath: path
            };

            if (singleFilename && items.length === 1) {
                data.singleFilename = singleFilename;
            }

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_copying'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.move = function(apiUrl, items, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'move',
                items: items,
                newPath: path
            };
            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_moving'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.remove = function(apiUrl, items) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'remove',
                items: items
            };

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_deleting'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.upload = function(apiUrl, destination, files) {
            var self = this;
            var deferred = $q.defer();
            self.inprocess = true;
            self.progress = 0;
            self.error = '';

            var data = {
                destination: destination
            };

            for (var i = 0; i < files.length; i++) {
                data['file-' + i] = files[i];
            }

            if (files && files.length) {
                Upload.upload({
                    url: apiUrl,
                    data: data
                }).then(function (data) {
                    self.deferredHandler(data.data, deferred, data.status);
                }, function (data) {
                    self.deferredHandler(data.data, deferred, data.status, 'Unknown error uploading files');
                }, function (evt) {
                    self.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total)) - 1;
                })['finally'](function() {
                    self.inprocess = false;
                    self.progress = 0;
                });
            }

            return deferred.promise;
        };

        ApiHandler.prototype.getContent = function(apiUrl, itemPath) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'getContent',
                item: itemPath
            };

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_getting_content'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.edit = function(apiUrl, itemPath, content) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'edit',
                item: itemPath,
                content: content
            };

            self.inprocess = true;
            self.error = '';

            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_modifying'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.rename = function(apiUrl, itemPath, newPath) {
            console.log()
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'rename',
                item: itemPath,
                newItemPath: newPath
            };
            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_renaming'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.getUrl = function(apiUrl, path) {
            var data = {
                action: 'download',
                path: path
            };
            return path && [apiUrl, $httpParamSerializer(data)].join('?');
        };

        ApiHandler.prototype.download = function(apiUrl, itemPath, toFilename, downloadByAjax, forceNewWindow) {
            var self = this;
            var url = this.getUrl(apiUrl, itemPath);

            if (!downloadByAjax || forceNewWindow || !$window.saveAs) {
                !$window.saveAs && $window.console.log('Your browser dont support ajax download, downloading by default');
                return !!$window.open(url, '_blank', '');
            }

            var deferred = $q.defer();
            self.inprocess = true;
            $http.get(url).then(function(response) {
                var bin = new $window.Blob([response.data]);
                deferred.resolve(response.data);
                $window.saveAs(bin, toFilename);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_downloading'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.downloadMultiple = function(apiUrl, items, toFilename, downloadByAjax, forceNewWindow) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'downloadMultiple',
                items: items,
                toFilename: toFilename
            };
            var url = [apiUrl, $httpParamSerializer(data)].join('?');

            if (!downloadByAjax || forceNewWindow || !$window.saveAs) {
                !$window.saveAs && $window.console.log('Your browser dont support ajax download, downloading by default');
                return !!$window.open(url, '_blank', '');
            }

            self.inprocess = true;
            $http.get(apiUrl).then(function(response) {
                var bin = new $window.Blob([response.data]);
                deferred.resolve(response.data);
                $window.saveAs(bin, toFilename);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_downloading'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.compress = function(apiUrl, items, compressedFilename, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'compress',
                items: items,
                destination: path,
                compressedFilename: compressedFilename
            };

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_compressing'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.extract = function(apiUrl, item, folderName, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'extract',
                item: item,
                destination: path,
                folderName: folderName
            };

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_extracting'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.changePermissions = function(apiUrl, items, permsOctal, permsCode, recursive) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'changePermissions',
                items: items,
                perms: permsOctal,
                permsCode: permsCode,
                recursive: !!recursive
            };

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_changing_perms'));
            })['finally'](function() {
                self.inprocess = false;
            });
            return deferred.promise;
        };

        ApiHandler.prototype.createFolder = function(apiUrl, path) {
            var self = this;
            var deferred = $q.defer();
            var data = {
                action: 'createFolder',
                newPath: path
            };

            self.inprocess = true;
            self.error = '';
            $http.post(apiUrl, data).then(function(response) {
                self.deferredHandler(response.data, deferred, response.status);
            }, function(response) {
                self.deferredHandler(response.data, deferred, response.status, $translate.instant('error_creating_folder'));
            })['finally'](function() {
                self.inprocess = false;
            });

            return deferred.promise;
        };

        return ApiHandler;

    }]);
})(angular);

(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').service('apiMiddleware', ['$window', 'fileManagerConfig', 'apiHandler', 
    angular.module('angularApp').service('apiMiddleware', ['$window', 'fileManagerConfig', 'apiHandler', 
        function ($window, fileManagerConfig, ApiHandler) {

        var ApiMiddleware = function() {
            this.apiHandler = new ApiHandler();
        };

        ApiMiddleware.prototype.getPath = function(arrayPath) {
            return '/' + arrayPath.join('/');
        };

        ApiMiddleware.prototype.getFileList = function(files) {
            return (files || []).map(function(file) {
                return file && file.model.fullPath();
            });
        };

        ApiMiddleware.prototype.getFilePath = function(item) {
            return item && item.model.fullPath();
        };

        ApiMiddleware.prototype.list = function(path, customDeferredHandler) {
            return this.apiHandler.list(fileManagerConfig.listUrl, this.getPath(path), customDeferredHandler);
        };

        ApiMiddleware.prototype.copy = function(files, path) {
            var items = this.getFileList(files);
            var singleFilename = items.length === 1 ? files[0].tempModel.name : undefined;
            return this.apiHandler.copy(fileManagerConfig.copyUrl, items, this.getPath(path), singleFilename);
        };

        ApiMiddleware.prototype.move = function(files, path) {
            var items = this.getFileList(files);
            return this.apiHandler.move(fileManagerConfig.moveUrl, items, this.getPath(path));
        };

        ApiMiddleware.prototype.remove = function(files) {
            var items = this.getFileList(files);
            return this.apiHandler.remove(fileManagerConfig.removeUrl, items);
        };

        ApiMiddleware.prototype.upload = function(files, path) {
            if (! $window.FormData) {
                throw new Error('Unsupported browser version');
            }

            var destination = this.getPath(path);

            return this.apiHandler.upload(fileManagerConfig.uploadUrl, destination, files);
        };

        ApiMiddleware.prototype.getContent = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.getContent(fileManagerConfig.getContentUrl, itemPath);
        };

        ApiMiddleware.prototype.edit = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.edit(fileManagerConfig.editUrl, itemPath, item.tempModel.content);
        };

        ApiMiddleware.prototype.rename = function(item) {
            var itemPath = this.getFilePath(item);
            var newPath = item.tempModel.fullPath();

            return this.apiHandler.rename(fileManagerConfig.renameUrl, itemPath, newPath);
        };

        ApiMiddleware.prototype.getUrl = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.getUrl(fileManagerConfig.downloadFileUrl, itemPath);
        };

        ApiMiddleware.prototype.download = function(item, forceNewWindow) {
            //TODO: add spinner to indicate file is downloading
            var itemPath = this.getFilePath(item);
            var toFilename = item.model.name;

            if (item.isFolder()) {
                return;
            }
            
            return this.apiHandler.download(
                fileManagerConfig.downloadFileUrl, 
                itemPath,
                toFilename,
                fileManagerConfig.downloadFilesByAjax,
                forceNewWindow
            );
        };

        ApiMiddleware.prototype.downloadMultiple = function(files, forceNewWindow) {
            var items = this.getFileList(files);
            var timestamp = new Date().getTime().toString().substr(8, 13);
            var toFilename = timestamp + '-' + fileManagerConfig.multipleDownloadFileName;
            
            return this.apiHandler.downloadMultiple(
                fileManagerConfig.downloadMultipleUrl, 
                items, 
                toFilename, 
                fileManagerConfig.downloadFilesByAjax,
                forceNewWindow
            );
        };

        ApiMiddleware.prototype.compress = function(files, compressedFilename, path) {
            var items = this.getFileList(files);
            return this.apiHandler.compress(fileManagerConfig.compressUrl, items, compressedFilename, this.getPath(path));
        };

        ApiMiddleware.prototype.extract = function(item, folderName, path) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.extract(fileManagerConfig.extractUrl, itemPath, folderName, this.getPath(path));
        };

        ApiMiddleware.prototype.changePermissions = function(files, dataItem) {
            var items = this.getFileList(files);
            var code = dataItem.tempModel.perms.toCode();
            var octal = dataItem.tempModel.perms.toOctal();
            var recursive = !!dataItem.tempModel.recursive;

            return this.apiHandler.changePermissions(fileManagerConfig.permissionsUrl, items, code, octal, recursive);
        };

        ApiMiddleware.prototype.createFolder = function(item) {
            var path = item.tempModel.fullPath();
            return this.apiHandler.createFolder(fileManagerConfig.createFolderUrl, path);
        };

        return ApiMiddleware;

    }]);
})(angular);
(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').service('fileNavigator', [
    angular.module('angularApp').service('fileNavigator', [
        'apiMiddleware', 'fileManagerConfig', 'item', function (ApiMiddleware, fileManagerConfig, Item) {

        var FileNavigator = function() {
            this.apiMiddleware = new ApiMiddleware();
            this.requesting = false;
            this.fileList = [];
            this.currentPath = this.getBasePath();
            this.history = [];
            this.error = '';

            this.onRefresh = function() {};
        };

        FileNavigator.prototype.getBasePath = function() {
            var path = (fileManagerConfig.basePath || '').replace(/^\//, '');
            return path.trim() ? path.split('/') : [];
        };

        FileNavigator.prototype.deferredHandler = function(data, deferred, code, defaultMsg) {
            if (!data || typeof data !== 'object') {
                this.error = 'Error %s - Bridge response error, please check the API docs or this ajax response.'.replace('%s', code);
            }
            if (code == 404) {
                this.error = 'Error 404 - Backend bridge is not working, please check the ajax response.';
            }
            if (code == 200) {
                this.error = null;
            }
            if (!this.error && data.result && data.result.error) {
                this.error = data.result.error;
            }
            if (!this.error && data.error) {
                this.error = data.error.message;
            }
            if (!this.error && defaultMsg) {
                this.error = defaultMsg;
            }
            if (this.error) {
                return deferred.reject(data);
            }
            return deferred.resolve(data);
        };

        FileNavigator.prototype.list = function() {
            return this.apiMiddleware.list(this.currentPath, this.deferredHandler.bind(this));
        };

        FileNavigator.prototype.refresh = function() {
            var self = this;
            if (! self.currentPath.length) {
                self.currentPath = this.getBasePath();
            }
            var path = self.currentPath.join('/');
            self.requesting = true;
            self.fileList = [];
            return self.list().then(function(data) {
                self.fileList = (data.result || []).map(function(file) {
                    return new Item(file, self.currentPath);
                });
                self.buildTree(path);
                self.onRefresh();
            }).finally(function() {
                self.requesting = false;
            });
        };
        
        FileNavigator.prototype.buildTree = function(path) {
            var flatNodes = [], selectedNode = {};

            function recursive(parent, item, path) {
                var absName = path ? (path + '/' + item.model.name) : item.model.name;
                if (parent.name && parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
                    parent.nodes = [];
                }
                if (parent.name !== path) {
                    parent.nodes.forEach(function(nd) {
                        recursive(nd, item, path);
                    });
                } else {
                    for (var e in parent.nodes) {
                        if (parent.nodes[e].name === absName) {
                            return;
                        }
                    }
                    parent.nodes.push({item: item, name: absName, nodes: []});
                }
                
                parent.nodes = parent.nodes.sort(function(a, b) {
                    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() === b.name.toLowerCase() ? 0 : 1;
                });
            }

            function flatten(node, array) {
                array.push(node);
                for (var n in node.nodes) {
                    flatten(node.nodes[n], array);
                }
            }

            function findNode(data, path) {
                return data.filter(function (n) {
                    return n.name === path;
                })[0];
            }

            //!this.history.length && this.history.push({name: '', nodes: []});
            !this.history.length && this.history.push({ name: this.getBasePath()[0] || '', nodes: [] });
            flatten(this.history[0], flatNodes);
            selectedNode = findNode(flatNodes, path);
            selectedNode && (selectedNode.nodes = []);

            for (var o in this.fileList) {
                var item = this.fileList[o];
                item instanceof Item && item.isFolder() && recursive(this.history[0], item, path);
            }
        };

        FileNavigator.prototype.folderClick = function(item) {
            this.currentPath = [];
            if (item && item.isFolder()) {
                this.currentPath = item.model.fullPath().split('/').splice(1);
            }
            this.refresh();
        };

        FileNavigator.prototype.upDir = function() {
            if (this.currentPath[0]) {
                this.currentPath = this.currentPath.slice(0, -1);
                this.refresh();
            }
        };

        FileNavigator.prototype.goTo = function(index) {
            this.currentPath = this.currentPath.slice(0, index + 1);
            this.refresh();
        };

        FileNavigator.prototype.fileNameExists = function(fileName) {
            return this.fileList.find(function(item) {
                return fileName && item.model.name.trim() === fileName.trim();
            });
        };

        FileNavigator.prototype.listHasFolders = function() {
            return this.fileList.find(function(item) {
                return item.model.type === 'dir';
            });
        };

        FileNavigator.prototype.getCurrentFolderName = function() {
            return this.currentPath.slice(-1)[0] || '/';
        };

        return FileNavigator;
    }]);
})(angular);

(function (angular) {
    'use strict';
    // angular.module('FileManagerApp').config(['$translateProvider', function ($translateProvider) {
    angular.module('angularApp').config(['$translateProvider', function ($translateProvider) {
        $translateProvider.useSanitizeValueStrategy(null);

        $translateProvider.translations('en', {
            filemanager: 'File Manager',
            language: 'Language',
            english: 'English',
            spanish: 'Spanish',
            portuguese: 'Portuguese',
            french: 'French',
            german: 'German',
            hebrew: 'Hebrew',
            italian: 'Italian',
            slovak: 'Slovak',
            chinese_tw: 'Traditional Chinese',
            chinese_cn: 'Simple Chinese',
            russian: 'Russian',
            ukrainian: 'Ukrainian',
            turkish: 'Turkish',
            persian: 'Persian',
            polish: 'Polish',
            dutch:  'Dutch',
            confirm: 'Confirm',
            cancel: 'Cancel',
            close: 'Close',
            upload_files: 'Upload files',
            files_will_uploaded_to: 'Files will be uploaded to',
            select_files: 'Select files',
            uploading: 'Uploading',
            permissions: 'Permissions',
            select_destination_folder: 'Select the destination folder',
            source: 'Source',
            destination: 'Destination',
            copy_file: 'Copy file',
            sure_to_delete: 'Are you sure to delete',
            change_name_move: 'Change name / move',
            enter_new_name_for: 'Enter new name for',
            extract_item: 'Extract item',
            extraction_started: 'Extraction started in a background process',
            compression_started: 'Compression started in a background process',
            enter_folder_name_for_extraction: 'Enter the folder name for the extraction of',
            enter_file_name_for_compression: 'Enter the file name for the compression of',
            toggle_fullscreen: 'Toggle fullscreen',
            edit_file: 'Edit file',
            file_content: 'File content',
            loading: 'Loading',
            search: 'Search',
            create_folder: 'Create folder',
            create: 'Create',
            folder_name: 'Folder name',
            upload: 'Upload',
            change_permissions: 'Change permissions',
            change: 'Change',
            details: 'Details',
            icons: 'Icons',
            list: 'List',
            name: 'Name',
            size: 'Size',
            actions: 'Actions',
            date: 'Date',
            selection: 'Selection',
            no_files_in_folder: 'No files in this folder',
            no_folders_in_folder: 'This folder not contains children folders',
            select_this: 'Select this',
            go_back: 'Go back',
            wait: 'Wait',
            move: 'Move',
            download: 'Download',
            view_item: 'View item',
            remove: 'Delete',
            edit: 'Edit',
            copy: 'Copy',
            rename: 'Rename',
            extract: 'Extract',
            compress: 'Compress',
            error_invalid_filename: 'Invalid filename or already exists, specify another name',
            error_modifying: 'An error occurred modifying the file',
            error_deleting: 'An error occurred deleting the file or folder',
            error_renaming: 'An error occurred renaming the file',
            error_copying: 'An error occurred copying the file',
            error_compressing: 'An error occurred compressing the file or folder',
            error_extracting: 'An error occurred extracting the file',
            error_creating_folder: 'An error occurred creating the folder',
            error_getting_content: 'An error occurred getting the content of the file',
            error_changing_perms: 'An error occurred changing the permissions of the file',
            error_uploading_files: 'An error occurred uploading files',
            sure_to_start_compression_with: 'Are you sure to compress',
            owner: 'Owner',
            group: 'Group',
            others: 'Others',
            read: 'Read',
            write: 'Write',
            exec: 'Exec',
            original: 'Original',
            changes: 'Changes',
            recursive: 'Recursive',
            preview: 'Item preview',
            open: 'Open',
            these_elements: 'these {{total}} elements',
            new_folder: 'New folder',
            download_as_zip: 'Download as ZIP'
        });

        $translateProvider.translations('nl', {
            filemanager: 'Bestand beheerder',
            language: 'Taal',
            english: 'Engels',
            spanish: 'Spaans',
            portuguese: 'Portugees',
            french: 'Frans',
            german: 'Duits',
            hebrew: 'Hebrews',
            slovak: 'Slowakije',
            chinese: 'Chinees',
            russian: 'Russisch',
            ukrainian: 'Oekra??ens',
            turkish: 'Turks',
            persian: 'Perzisch',
            confirm: 'Bevestigen',
            cancel: 'Annuleren',
            close: 'Sluiten',
            upload_files: 'Bestanden uploaden',
            files_will_uploaded_to: 'Bestanden worden ge??pload naar',
            select_files: 'Selecteer bestanden',
            uploading: 'Uploaden',
            permissions: 'Rechten',
            select_destination_folder: 'Selecteer de map van bestemming',
            source: 'Bron',
            destination: 'Doel',
            copy_file: 'Kopieer bestand',
            sure_to_delete: 'Weet je zeker dat je wilt verwijderen',
            change_name_move: 'Hernoemen / verplaatsen',
            enter_new_name_for: 'Typ een nieuwe naam voor',
            extract_item: 'Uitpakken',
            extraction_started: 'Uitpakken gestart als achtergrond proces',
            compression_started: 'Inpakken gestart als achtergrond proces',
            enter_folder_name_for_extraction: 'Typ een map naar voor het uitpakken van',
            enter_file_name_for_compression: 'Typ een bestandsnaam voor het inpakken van',
            toggle_fullscreen: 'Volledigscherm',
            edit_file: 'Bewerk bestand',
            file_content: 'Bestandsinhoud',
            loading: 'Laden',
            search: 'Zoeken',
            create_folder: 'Maak map',
            create: 'Maak',
            folder_name: 'Map naam',
            upload: 'Uploaden',
            change_permissions: 'Rechten aanpassen',
            change: 'Aanpassen',
            details: 'Details',
            icons: 'Iconen',
            list: 'Lijst',
            name: 'Naam',
            size: 'Grootte',
            actions: 'Acties',
            date: 'Datum',
            no_files_in_folder: 'Geen bestanden in deze map',
            no_folders_in_folder: 'Deze map bevat geen submappen',
            select_this: 'Selecteer dit',
            go_back: 'Ga terug',
            wait: 'Wacht',
            move: 'Verplaats',
            download: 'Download',
            view_item: 'Bekijk item',
            remove: 'Verwijderen',
            edit: 'Bewerken',
            copy: 'Kopi??ren',
            rename: 'Hernoemen',
            extract: 'Uitpakken',
            compress: 'Inpakken',
            error_invalid_filename: 'Ongeldige bestandsnaam of bestand al aanwezig, kies een andere naam',
            error_modifying: 'Er is een fout opgetreden met het bewerken van het bestand',
            error_deleting: 'Er is een fout opgetreden tijdens het verwijderen van de bestand of map',
            error_renaming: 'Er is een fout opgetreden tijdens het hernoemen van het bestand',
            error_copying: 'Er is een fout opgetreden tijdens het kopi??ren van het bestand',
            error_compressing: 'Er is een fout opgetreden tijdens het inpakken van het bestand of map',
            error_extracting: 'Er is een fout opgetreden tijdens het uitpakken van het bestand',
            error_creating_folder: 'Er is een fout opgetreden tijdens het maken van de map',
            error_getting_content: 'Er is een fout opgetreden tijdens het ophalen van de inhoud van het bestand',
            error_changing_perms: 'Er is een fout opgetreden tijdens het aanpassen van de rechten van het bestand',
            error_uploading_files: 'Er is een fout opgetreden tijdens het uploaden van de bestanden',
            sure_to_start_compression_with: 'Weet je zeker dat je dit wilt inpakken',
            owner: 'Eigenaar',
            group: 'Groep',
            others: 'Andere',
            read: 'Lees',
            write: 'Schrijf',
            exec: 'Uitvoeren',
            original: 'Origineel',
            changes: 'Aanpassingen',
            recursive: 'Recursieve',
            preview: 'Item bekijken',
            open: 'Openen',
            these_elements: 'Deze {{total}} elementen',
            new_folder: 'Nieuwe map',
            download_as_zip: 'Download als ZIP'
        });

        $translateProvider.translations('he', {
            filemanager: '???????? ??????????',
            language: '??????',
            english: '????????????',
            spanish: '????????????',
            portuguese: '??????????????????',
            french: '????????????',
            german: '????????????',
            hebrew: '????????',
            italian: '????????????',
            slovak: '????????????',
            chinese_tw: '?????????? ??????????????',
            chinese_cn: '?????????? ??????????',
            russian: '????????????',
            ukrainian: '????????????????',
            turkish: '??????????',
            persian: '????????????????',
            polish: '??????????',
            confirm: '??????',
            cancel: '??????',
            close: '????????',
            upload_files: '???????? ??????????',
            files_will_uploaded_to: '???????????? ???????? ??',
            select_files: '?????? ??????????',
            uploading: '????????',
            permissions: '????????????',
            select_destination_folder: '?????? ???????????? ??????',
            source: '????????',
            destination: '??????',
            copy_file: '???????? ????????',
            sure_to_delete: '?????? ?????? ???????? ?????????????? ??????????',
            change_name_move: '?????? ???? / ??????',
            enter_new_name_for: '???????? ???? ?????? ????????',
            extract_item: '?????? ????????',
            extraction_started: '?????????? ???????????? ?????????? ????????',
            compression_started: '?????????? ???????????? ?????????? ????????',
            enter_folder_name_for_extraction: '???????? ???? ???????????? ???????????? ????????',
            enter_file_name_for_compression: '?????? ???? ???? ?????????? ???????? ???????????? ????',
            toggle_fullscreen: '????????/?????? ?????? ??????',
            edit_file: '???????? ????????',
            file_content: '???????? ??????????',
            loading: '????????',
            search: '??????',
            create_folder: '?????? ????????????',
            create: '??????',
            folder_name: '???? ????????????',
            upload: '????????',
            change_permissions: '?????? ????????????',
            change: '??????',
            details: '??????????',
            icons: '??????????',
            list: '??????????',
            name: '????',
            size: '????????',
            actions: '????????????',
            date: '??????????',
            selection: '??????????????????',
            no_files_in_folder: '?????? ?????????? ?????????????? ????',
            no_folders_in_folder: '?????????????? ?????? ???????? ?????????? ?????? ????????????',
            select_this: '?????? ???? ????',
            go_back: '???????? ??????????',
            wait: '??????',
            move: '??????',
            download: '????????',
            view_item: '?????? ????????',
            remove: '??????',
            edit: '????????',
            copy: '????????',
            rename: '?????? ????',
            extract: '??????',
            compress: '????????',
            error_invalid_filename: '???? ???????? ???????? ???????? ???? ????????, ???????? ???? ???????? ??????',
            error_modifying: '???????????? ?????????? ?????? ?????????? ??????????',
            error_deleting: '???????????? ?????????? ?????? ?????????? ?????????? ???? ??????????????',
            error_renaming: '???????????? ?????????? ?????? ?????????? ???? ??????????',
            error_copying: '???????????? ?????????? ?????? ?????????? ??????????',
            error_compressing: '???????????? ?????????? ?????? ?????????? ?????????? ???? ??????????????',
            error_extracting: '???????????? ?????????? ?????? ?????????? ?????????? ???? ??????????????',
            error_creating_folder: '???????????? ?????????? ?????? ?????????? ??????????????',
            error_getting_content: '???????????? ?????????? ?????? ???????? ???????? ??????????',
            error_changing_perms: '???????????? ?????????? ?????? ?????????? ???????????? ??????????',
            error_uploading_files: '???????????? ?????????? ?????? ?????????? ????????????',
            sure_to_start_compression_with: '?????? ?????? ???????? ?????????????? ??????????',
            owner: '??????????',
            group: '??????????',
            others: '??????????',
            read: '??????????',
            write: '??????????',
            exec: '????????',
            original: '??????????',
            changes: '??????????????',
            recursive: '??????????????',
            preview: '???????? ????????',
            open: '??????',
            new_folder: '?????????? ????????',
            download_as_zip: '???????????? ??????'
        });

        $translateProvider.translations('pt', {
            filemanager: 'Gerenciador de arquivos',
            language: 'L??ngua',
            english: 'Ingl??s',
            spanish: 'Espanhol',
            portuguese: 'Portugues',
            french: 'Franc??s',
            german: 'Alem??o',
            hebrew: 'Hebraico',
            italian: 'Italiano',
            slovak: 'Eslovaco',
            chinese_tw: 'Tradicional Chinesa',
            chinese_cn: 'Chin??s Simplificado',
            russian: 'Russo',
            ukrainian: 'Ucraniano',
            turkish: 'Turco',
            persian: 'Persa',
            polish: 'Polon??s',
            confirm: 'Confirmar',
            cancel: 'Cancelar',
            close: 'Fechar',
            upload_files: 'Carregar arquivos',
            files_will_uploaded_to: 'Os arquivos ser??o enviados para',
            select_files: 'Selecione os arquivos',
            uploading: 'Carregar',
            permissions: 'Autoriza????es',
            select_destination_folder: 'Selecione a pasta de destino',
            source: 'Origem',
            destination: 'Destino',
            copy_file: 'Copiar arquivo',
            sure_to_delete: 'Tem certeza de que deseja apagar',
            change_name_move: 'Renomear / mudan??a',
            enter_new_name_for: 'Digite o novo nome para',
            extract_item: 'Extrair arquivo',
            extraction_started: 'A extra????o come??ou em um processo em segundo plano',
            compression_started: 'A compress??o come??ou em um processo em segundo plano',
            enter_folder_name_for_extraction: 'Digite o nome da pasta para a extra????o de',
            enter_file_name_for_compression: 'Digite o nome do arquivo para a compress??o de',
            toggle_fullscreen: 'Ativar/desativar tela cheia',
            edit_file: 'Editar arquivo',
            file_content: 'Conte??do do arquivo',
            loading: 'Carregando',
            search: 'Localizar',
            create_folder: 'Criar Pasta',
            create: 'Criar',
            folder_name: 'Nome da pasta',
            upload: 'Fazer',
            change_permissions: 'Alterar permiss??es',
            change: 'Alterar',
            details: 'Detalhes',
            icons: 'Icones',
            list: 'Lista',
            name: 'Nome',
            size: 'Tamanho',
            actions: 'A????es',
            date: 'Data',
            selection: 'Sele????o',
            no_files_in_folder: 'N??o h?? arquivos nesta pasta',
            no_folders_in_folder: 'Esta pasta n??o cont??m subpastas',
            select_this: 'Selecione esta',
            go_back: 'Voltar',
            wait: 'Espere',
            move: 'Mover',
            download: 'Baixar',
            view_item: 'Veja o arquivo',
            remove: 'Excluir',
            edit: 'Editar',
            copy: 'Copiar',
            rename: 'Renomear',
            extract: 'Extrair',
            compress: 'Comprimir',
            error_invalid_filename: 'Nome do arquivo inv??lido ou nome de arquivo j?? existe, especifique outro nome',
            error_modifying: 'Ocorreu um erro ao modificar o arquivo',
            error_deleting: 'Ocorreu um erro ao excluir o arquivo ou pasta',
            error_renaming: 'Ocorreu um erro ao mudar o nome do arquivo',
            error_copying: 'Ocorreu um erro ao copiar o arquivo',
            error_compressing: 'Ocorreu um erro ao comprimir o arquivo ou pasta',
            error_extracting: 'Ocorreu um erro ao extrair o arquivo',
            error_creating_folder: 'Ocorreu um erro ao criar a pasta',
            error_getting_content: 'Ocorreu um erro ao obter o conte??do do arquivo',
            error_changing_perms: 'Ocorreu um erro ao alterar as permiss??es do arquivo',
            error_uploading_files: 'Ocorreu um erro upload de arquivos',
            sure_to_start_compression_with: 'Tem certeza que deseja comprimir',
            owner: 'Propriet??rio',
            group: 'Grupo',
            others: 'Outros',
            read: 'Leitura',
            write: 'Escrita ',
            exec: 'Execu????o',
            original: 'Original',
            changes: 'Mudan??as',
            recursive: 'Recursiva',
            preview: 'Visualiza????o',
            open: 'Abrir',
            these_elements: 'estes {{total}} elements',
            new_folder: 'Nova pasta',
            download_as_zip: 'Download como ZIP'
        });

        $translateProvider.translations('es', {
            filemanager: 'Administrador de archivos',
            language: 'Idioma',
            english: 'Ingles',
            spanish: 'Espa??ol',
            portuguese: 'Portugues',
            french: 'Franc??s',
            german: 'Alem??n',
            hebrew: 'Hebreo',
            italian: 'Italiano',
            slovak: 'Eslovaco',
            chinese_tw: 'Tradicional China',
            chinese_cn: 'Chino Simplificado',
            russian: 'Ruso',
            ukrainian: 'Ucraniano',
            turkish: 'Turco',
            persian: 'Persa',
            polish: 'Polaco',
            confirm: 'Confirmar',
            cancel: 'Cancelar',
            close: 'Cerrar',
            upload_files: 'Subir archivos',
            files_will_uploaded_to: 'Los archivos seran subidos a',
            select_files: 'Seleccione los archivos',
            uploading: 'Subiendo',
            permissions: 'Permisos',
            select_destination_folder: 'Seleccione la carpeta de destino',
            source: 'Origen',
            destination: 'Destino',
            copy_file: 'Copiar archivo',
            sure_to_delete: 'Esta seguro que desea eliminar',
            change_name_move: 'Renombrar / mover',
            enter_new_name_for: 'Ingrese el nuevo nombre para',
            extract_item: 'Extraer archivo',
            extraction_started: 'La extraccion ha comenzado en un proceso de segundo plano',
            compression_started: 'La compresion ha comenzado en un proceso de segundo plano',
            enter_folder_name_for_extraction: 'Ingrese el nombre de la carpeta para la extraccion de',
            enter_file_name_for_compression: 'Ingrese el nombre del archivo para la compresion de',
            toggle_fullscreen: 'Activar/Desactivar pantalla completa',
            edit_file: 'Editar archivo',
            file_content: 'Contenido del archivo',
            loading: 'Cargando',
            search: 'Buscar',
            create_folder: 'Crear carpeta',
            create: 'Crear',
            folder_name: 'Nombre de la carpeta',
            upload: 'Subir',
            change_permissions: 'Cambiar permisos',
            change: 'Cambiar',
            details: 'Detalles',
            icons: 'Iconos',
            list: 'Lista',
            name: 'Nombre',
            size: 'Tama??o',
            actions: 'Acciones',
            date: 'Fecha',
            selection: 'Selecci??n',
            no_files_in_folder: 'No hay archivos en esta carpeta',
            no_folders_in_folder: 'Esta carpeta no contiene sub-carpetas',
            select_this: 'Seleccionar esta',
            go_back: 'Volver',
            wait: 'Espere',
            move: 'Mover',
            download: 'Descargar',
            view_item: 'Ver archivo',
            remove: 'Eliminar',
            edit: 'Editar',
            copy: 'Copiar',
            rename: 'Renombrar',
            extract: 'Extraer',
            compress: 'Comprimir',
            error_invalid_filename: 'El nombre del archivo es invalido o ya existe',
            error_modifying: 'Ocurrio un error al intentar modificar el archivo',
            error_deleting: 'Ocurrio un error al intentar eliminar el archivo',
            error_renaming: 'Ocurrio un error al intentar renombrar el archivo',
            error_copying: 'Ocurrio un error al intentar copiar el archivo',
            error_compressing: 'Ocurrio un error al intentar comprimir el archivo',
            error_extracting: 'Ocurrio un error al intentar extraer el archivo',
            error_creating_folder: 'Ocurrio un error al intentar crear la carpeta',
            error_getting_content: 'Ocurrio un error al obtener el contenido del archivo',
            error_changing_perms: 'Ocurrio un error al cambiar los permisos del archivo',
            error_uploading_files: 'Ocurrio un error al subir archivos',
            sure_to_start_compression_with: 'Esta seguro que desea comprimir',
            owner: 'Propietario',
            group: 'Grupo',
            others: 'Otros',
            read: 'Lectura',
            write: 'Escritura',
            exec: 'Ejecucion',
            original: 'Original',
            changes: 'Cambios',
            recursive: 'Recursivo',
            preview: 'Vista previa',
            open: 'Abrir',
            these_elements: 'estos {{total}} elementos',
            new_folder: 'Nueva carpeta',
            download_as_zip: 'Descargar como ZIP'
        });

        $translateProvider.translations('fr', {
            filemanager: 'Gestionnaire de fichier',
            language: 'Langue',
            english: 'Anglais',
            spanish: 'Espagnol',
            portuguese: 'Portugais',
            french: 'Fran??ais',
            german: 'Allemand',
            hebrew: 'H??breu',
            italian: 'Italien',
            slovak: 'Slovaque',
            chinese_tw: 'Traditionnelle Chinoise',
            chinese_cn: 'Chinois Simplifi??',
            russian: 'Russe',
            ukrainian: 'Ukrainien',
            turkish: 'Turc',
            persian: 'Persan',
            polish: 'Polonais',
            confirm: 'Confirmer',
            cancel: 'Annuler',
            close: 'Fermer',
            upload_files: 'T??l??charger des fichiers',
            files_will_uploaded_to: 'Les fichiers seront upload?? dans',
            select_files: 'S??lectionnez les fichiers',
            uploading: 'Upload en cours',
            permissions: 'Permissions',
            select_destination_folder: 'S??lectionn?? le dossier de destination',
            source: 'Source',
            destination: 'Destination',
            copy_file: 'Copier le fichier',
            sure_to_delete: '??tes-vous s??r de vouloir supprimer',
            change_name_move: 'Renommer / D??placer',
            enter_new_name_for: 'Entrer le nouveau nom pour',
            extract_item: 'Extraires les ??l??ments',
            extraction_started: 'L\'extraction a d??marr?? en t??che de fond',
            compression_started: 'La compression a d??marr?? en t??che de fond',
            enter_folder_name_for_extraction: 'Entrer le nom du dossier pour l\'extraction de',
            enter_file_name_for_compression: 'Entrez le nom de fichier pour la compression de',
            toggle_fullscreen: 'Basculer en plein ??cran',
            edit_file: '??diter le fichier',
            file_content: 'Contenu du fichier',
            loading: 'Chargement en cours',
            search: 'Recherche',
            create_folder: 'Cr??er un dossier',
            create: 'Cr??er',
            folder_name: 'Nom du dossier',
            upload: 'Upload',
            change_permissions: 'Changer les permissions',
            change: 'Changer',
            details: 'Details',
            icons: 'Icons',
            list: 'Liste',
            name: 'Nom',
            size: 'Taille',
            actions: 'Actions',
            date: 'Date',
            selection: 'S??lection',
            no_files_in_folder: 'Aucun fichier dans ce dossier',
            no_folders_in_folder: 'Ce dossier ne contiens pas de dossier',
            select_this: 'S??lectionner',
            go_back: 'Retour',
            wait: 'Patienter',
            move: 'D??placer',
            download: 'T??l??charger',
            view_item: 'Voir l\'??l??ment',
            remove: 'Supprimer',
            edit: '??diter',
            copy: 'Copier',
            rename: 'Renommer',
            extract: 'Extraire',
            compress: 'Compresser',
            error_invalid_filename: 'Nom de fichier invalide ou d??j?? existant, merci de sp??cifier un autre nom',
            error_modifying: 'Une erreur est survenue pendant la modification du fichier',
            error_deleting: 'Une erreur est survenue pendant la suppression du fichier ou du dossier',
            error_renaming: 'Une erreur est survenue pendant le renommage du fichier',
            error_copying: 'Une erreur est survenue pendant la copie du fichier',
            error_compressing: 'Une erreur est survenue pendant la compression du fichier ou du dossier',
            error_extracting: 'Une erreur est survenue pendant l\'extraction du fichier',
            error_creating_folder: 'Une erreur est survenue pendant la cr??ation du dossier',
            error_getting_content: 'Une erreur est survenue pendant la r??cup??ration du contenu du fichier',
            error_changing_perms: 'Une erreur est survenue pendant le changement des permissions du fichier',
            error_uploading_files: 'Une erreur est survenue pendant l\'upload des fichiers',
            sure_to_start_compression_with: '??tes-vous s??re de vouloir compresser',
            owner: 'Propri??taire',
            group: 'Groupe',
            others: 'Autres',
            read: 'Lecture',
            write: '??criture',
            exec: '??x??cution',
            original: 'Original',
            changes: 'Modifications',
            recursive: 'R??cursif',
            preview: 'Aper??u',
            open: 'Ouvrir',
            these_elements: 'ces {{total}} ??l??ments',
            new_folder: 'Nouveau dossier',
            download_as_zip: 'T??l??charger comme ZIP'
        });

        $translateProvider.translations('de', {
            filemanager: 'Dateimanager',
            language: 'Sprache',
            english: 'Englisch',
            spanish: 'Spanisch',
            portuguese: 'Portugiesisch',
            french: 'Franz??sisch',
            german: 'Deutsch',
            hebrew: 'Hebr??isch',
            italian: 'Italienisch',
            slovak: 'Slowakisch',
            chinese_tw: 'Traditionelles Chinesisch',
            chinese_cn: 'Vereinfachtes Chinesisch',
            russian: 'Russisch',
            ukrainian: 'Ukrainisch',
            turkish: 'T??rkisch',
            persian: 'Persisch',
            polish: 'Polnisch',
            confirm: 'Best??tigen',
            cancel: 'Abbrechen',
            close: 'Schlie??en',
            upload_files: 'Hochladen von Dateien',
            files_will_uploaded_to: 'Dateien werden hochgeladen nach',
            select_files: 'W??hlen Sie die Dateien',
            uploading: 'Lade hoch',
            permissions: 'Berechtigungen',
            select_destination_folder: 'W??hlen Sie einen Zielordner',
            source: 'Quelle',
            destination: 'Ziel',
            copy_file: 'Datei kopieren',
            sure_to_delete: 'Sind Sie sicher, dass Sie die Datei l??schen m??chten?',
            change_name_move: 'Namen ??ndern / verschieben',
            enter_new_name_for: 'Geben Sie den neuen Namen ein f??r',
            extract_item: 'Archiv entpacken',
            extraction_started: 'Entpacken hat im Hintergrund begonnen',
            compression_started: 'Komprimierung hat im Hintergrund begonnen',
            enter_folder_name_for_extraction: 'Geben Sie den Verzeichnisnamen f??r die Entpackung an von',
            enter_file_name_for_compression: 'Geben Sie den Dateinamen f??r die Kompression an von',
            toggle_fullscreen: 'Vollbild umschalten',
            edit_file: 'Datei bearbeiten',
            file_content: 'Dateiinhalt',
            loading: 'Lade',
            search: 'Suche',
            create_folder: 'Ordner erstellen',
            create: 'Erstellen',
            folder_name: 'Verzeichnisname',
            upload: 'Hochladen',
            change_permissions: 'Berechtigungen ??ndern',
            change: '??ndern',
            details: 'Details',
            icons: 'Symbolansicht',
            list: 'Listenansicht',
            name: 'Name',
            size: 'Gr????e',
            actions: 'Aktionen',
            date: 'Datum',
            selection: 'Auswahl',
            no_files_in_folder: 'Keine Dateien in diesem Ordner',
            no_folders_in_folder: 'Dieser Ordner enth??lt keine Unterordner',
            select_this: 'Ausw??hlen',
            go_back: 'Zur??ck',
            wait: 'Warte',
            move: 'Verschieben',
            download: 'Herunterladen',
            view_item: 'Datei ansehen',
            remove: 'L??schen',
            edit: 'Bearbeiten',
            copy: 'Kopieren',
            rename: 'Umbenennen',
            extract: 'Entpacken',
            compress: 'Komprimieren',
            error_invalid_filename: 'Ung??ltiger Dateiname oder existiert bereits',
            error_modifying: 'Beim Bearbeiten der Datei ist ein Fehler aufgetreten',
            error_deleting: 'Beim L??schen der Datei oder des Ordners ist ein Fehler aufgetreten',
            error_renaming: 'Beim Umbennenen der Datei ist ein Fehler aufgetreten',
            error_copying: 'Beim Kopieren der Datei ist ein Fehler aufgetreten',
            error_compressing: 'Beim Komprimieren der Datei oder des Ordners ist ein Fehler aufgetreten',
            error_extracting: 'Beim Entpacken der Datei ist ein Fehler aufgetreten',
            error_creating_folder: 'Beim Erstellen des Ordners ist ein Fehler aufgetreten',
            error_getting_content: 'Beim Laden des Dateiinhalts ist ein Fehler aufgetreten',
            error_changing_perms: 'Beim ??ndern der Dateiberechtigungen ist ein Fehler aufgetreten',
            error_uploading_files: 'Beim Hochladen der Dateien ist ein Fehler aufgetreten',
            sure_to_start_compression_with: 'M??chten Sie die Datei wirklich komprimieren?',
            owner: 'Besitzer',
            group: 'Gruppe',
            others: 'Andere',
            read: 'Lesen',
            write: 'Schreiben',
            exec: 'Ausf??hren',
            original: 'Original',
            changes: '??nderungen',
            recursive: 'Rekursiv',
            preview: 'Dateivorschau',
            open: '??ffnen',
            these_elements: 'diese {{total}} elemente',
            new_folder: 'Neuer ordner',
            download_as_zip: 'Download als ZIP'
        });

        $translateProvider.translations('sk', {
            filemanager: 'Spr??vca s??borov',
            language: 'Jazyk',
            english: 'Angli??tina',
            spanish: '??paniel??ina',
            portuguese: 'Portugal??ina',
            french: 'Franc??z??tina',
            german: 'Nem??ina',
            hebrew: 'Hebrej??ina',
            italian: 'Ital??tina',
            slovak: 'Sloven??ina',
            chinese_tw: 'Tradi??n?? ????nska',
            chinese_cn: 'Zjednodu??en?? ????n??tina',
            russian: 'Rusk??',
            ukrainian: 'Ukrajinsk??',
            turkish: 'Tureck??',
            persian: 'Perzsk??',
            polish: 'Po??sk??',
            confirm: 'Potvrdi??',
            cancel: 'Zru??i??',
            close: 'Zavrie??',
            upload_files: 'Nahr??va?? s??bory',
            files_will_uploaded_to: 'S??bory bud?? nahran?? do',
            select_files: 'Vybra?? s??bory',
            uploading: 'Nahr??vanie',
            permissions: 'Opr??vnenia',
            select_destination_folder: 'Vyberte cie??ov?? pr??e??inok',
            source: 'Zdroj',
            destination: 'Cie??',
            copy_file: 'Kop??rova?? s??bor',
            sure_to_delete: 'Ste si ist??, ??e chcete vymaza??',
            change_name_move: 'Premenova?? / Premiestni??',
            enter_new_name_for: 'Zadajte nov?? meno pre',
            extract_item: 'Rozbali?? polo??ku',
            extraction_started: 'Rozba??ovanie za??alo v procese na pozad??',
            compression_started: 'Kompresia za??ala v procese na pzoad??',
            enter_folder_name_for_extraction: 'Zadajte n??zov prie??inka na rozbalenie',
            enter_file_name_for_compression: 'Zadajte n??zov s??boru pre kompresiu',
            toggle_fullscreen: 'Prepn???? re??im na cel?? obrazovku',
            edit_file: 'Upravi?? s??bor',
            file_content: 'Obsah s??boru',
            loading: 'Na????tavanie',
            search: 'H??ada??',
            create_folder: 'Vytvori?? prie??inok',
            create: 'Vytvori??',
            folder_name: 'N??zov prie??inka',
            upload: 'Nahra??',
            change_permissions: 'Zmeni?? opr??vnenia',
            change: 'Zmeni??',
            details: 'Podrobnosti',
            icons: 'Ikony',
            list: 'Zoznam',
            name: 'Meno',
            size: 'Ve??kos??',
            actions: 'Akcie',
            date: 'D??tum',
            selection: 'V??ber',
            no_files_in_folder: 'V tom to prie??inku nie s?? ??iadne s??bory',
            no_folders_in_folder: 'Tento prie??inok neobsahuje ??iadne ??al??ie prie??inky',
            select_this: 'Vybra?? tento',
            go_back: '??s?? sp????',
            wait: 'Po??kajte',
            move: 'Presun????',
            download: 'Stiahnu??',
            view_item: 'Zobrazi?? polo??ku',
            remove: 'Vymaza??',
            edit: 'Upravi??',
            copy: 'Kop??rova??',
            rename: 'Premenova??',
            extract: 'Rozbali??',
            compress: 'Komprimova??',
            error_invalid_filename: 'Neplatn?? alebo duplicitn?? meno s??boru, vyberte in?? meno',
            error_modifying: 'Vyskytla sa chyba pri upravovan?? s??boru',
            error_deleting: 'Vyskytla sa chyba pri mazan?? s??boru alebo prie??inku',
            error_renaming: 'Vyskytla sa chyba pri premenovan?? s??boru',
            error_copying: 'Vyskytla sa chyba pri kop??rovan?? s??boru',
            error_compressing: 'Vyskytla sa chyba pri komprimovan?? s??boru alebo prie??inka',
            error_extracting: 'Vyskytla sa chyba pri rozba??ovan?? s??boru',
            error_creating_folder: 'Vyskytla sa chyba pri vytv??ran?? prie??inku',
            error_getting_content: 'Vyskytla sa chyba pri z??skavan?? obsahu s??boru',
            error_changing_perms: 'Vyskytla sa chyba pri zmene opr??vnen?? s??boru',
            error_uploading_files: 'Vyskytla sa chyba pri nahr??van?? s??borov',
            sure_to_start_compression_with: 'Ste si ist??, ??e chcete komprimova??',
            owner: 'Vlastn??k',
            group: 'Skupina',
            others: 'Ostatn??',
            read: '????tanie',
            write: 'Zapisovanie',
            exec: 'Sp????tanie',
            original: 'Origin??l',
            changes: 'Zmeny',
            recursive: 'Rekurz??vne',
            preview: 'N??h??ad polo??ky',
            open: 'Otvori??',
            these_elements: 't??chto {{total}} prvkov',
            new_folder: 'Nov?? prie??inok',
            download_as_zip: 'Stiahnu?? ako ZIP'
        });

        $translateProvider.translations('zh_cn', {
            filemanager: '???????????????',
            language: '??????',
            english: '??????',
            spanish: '????????????',
            portuguese: '????????????',
            french: '??????',
            german: '??????',
            hebrew: '????????????',
            italian: '?????????',
            slovak: '???????????????',
            chinese_tw: '????????????',
            chinese_cn: '????????????',
            russian: '??????',
            ukrainian: '?????????',
            turkish: '?????????',
            persian: '?????????',
            polish: '?????????',
            confirm: '??????',
            cancel: '??????',
            close: '??????',
            upload_files: '????????????',
            files_will_uploaded_to: '??????????????????',
            select_files: '????????????',
            uploading: '?????????',
            permissions: '??????',
            select_destination_folder: '??????????????????',
            source: '??????',
            destination: '?????????',
            copy_file: '????????????',
            sure_to_delete: '??????????????????',
            change_name_move: '??????????????????',
            enter_new_name_for: '??????????????????',
            extract_item: '??????',
            extraction_started: '???????????????????????????',
            compression_started: '???????????????????????????',
            enter_folder_name_for_extraction: '??????????????????????????????',
            enter_file_name_for_compression: '???????????????????????????',
            toggle_fullscreen: '????????????',
            edit_file: '????????????',
            file_content: '????????????',
            loading: '?????????',
            search: '??????',
            create_folder: '???????????????',
            create: '??????',
            folder_name: '???????????????',
            upload: '??????',
            change_permissions: '????????????',
            change: '??????',
            details: '????????????',
            icons: '??????',
            list: '??????',
            name: '??????',
            size: '??????',
            actions: '??????',
            date: '??????',
            selection: '??????',
            no_files_in_folder: '????????????????????????',
            no_folders_in_folder: '?????????????????????????????????',
            select_this: '???????????????',
            go_back: '??????',
            wait: '??????',
            move: '??????',
            download: '??????',
            view_item: '????????????',
            remove: '??????',
            edit: '??????',
            copy: '??????',
            rename: '?????????',
            extract: '??????',
            compress: '??????',
            error_invalid_filename: '????????????????????????????????????, ?????????????????????',
            error_modifying: '??????????????????',
            error_deleting: '??????????????????????????????',
            error_renaming: '?????????????????????',
            error_copying: '??????????????????',
            error_compressing: '??????????????????????????????',
            error_extracting: '??????????????????',
            error_creating_folder: '?????????????????????',
            error_getting_content: '????????????????????????',
            error_changing_perms: '????????????????????????',
            error_uploading_files: '??????????????????',
            sure_to_start_compression_with: '??????????????????',
            owner: '?????????',
            group: '??????',
            others: '??????',
            read: '??????',
            write: '??????',
            exec: '??????',
            original: '??????',
            changes: '??????',
            recursive: '??????',
            preview: '????????????',
            open: '??????',
            these_elements: '??? {{total}} ???',
            new_folder: '????????????',
            download_as_zip: '?????????ZIP'
        });

        $translateProvider.translations('zh_tw', {
            filemanager: '???????????????',
            language: '??????',
            english: '??????',
            spanish: '????????????',
            portuguese: '????????????',
            french: '??????',
            german: '??????',
            hebrew: '????????????',
            italian: '?????????',
            slovak: '???????????????',
            chinese_tw: '????????????',
            chinese_cn: '????????????',
            russian: '??????',
            ukrainian: '?????????',
            turkish: '?????????',
            persian: '?????????',
            polish: '?????????',
            confirm: '??????',
            cancel: '??????',
            close: '??????',
            upload_files: '????????????',
            files_will_uploaded_to: '??????????????????',
            select_files: '????????????',
            uploading: '?????????',
            permissions: '??????',
            select_destination_folder: '??????????????????',
            source: '??????',
            destination: '?????????',
            copy_file: '????????????',
            sure_to_delete: '??????????????????',
            change_name_move: '??????????????????',
            enter_new_name_for: '??????????????????',
            extract_item: '??????',
            extraction_started: '???????????????????????????',
            compression_started: '???????????????????????????',
            enter_folder_name_for_extraction: '??????????????????????????????',
            enter_file_name_for_compression: '????????????????????????',
            toggle_fullscreen: '???????????????',
            edit_file: '????????????',
            file_content: '????????????',
            loading: '?????????',
            search: '??????',
            create_folder: '???????????????',
            create: '??????',
            folder_name: '???????????????',
            upload: '??????',
            change_permissions: '????????????',
            change: '??????',
            details: '????????????',
            icons: '??????',
            list: '??????',
            name: '??????',
            size: '??????',
            actions: '??????',
            date: '??????',
            selection: '??????',
            no_files_in_folder: '????????????????????????',
            no_folders_in_folder: '?????????????????????????????????',
            select_this: '??????????????????',
            go_back: '??????',
            wait: '??????',
            move: '??????',
            download: '??????',
            view_item: '??????',
            remove: '??????',
            edit: '??????',
            copy: '??????',
            rename: '????????????',
            extract: '??????',
            compress: '??????',
            error_invalid_filename: '?????????????????????????????????, ?????????????????????',
            error_modifying: '??????????????????',
            error_deleting: '??????????????????????????????',
            error_renaming: '????????????????????????',
            error_copying: '??????????????????',
            error_compressing: '??????????????????????????????',
            error_extracting: '??????????????????',
            error_creating_folder: '?????????????????????',
            error_getting_content: '????????????????????????',
            error_changing_perms: '????????????????????????',
            error_uploading_files: '??????????????????',
            sure_to_start_compression_with: '??????????????????',
            owner: '?????????',
            group: '??????',
            others: '??????',
            read: '??????',
            write: '??????',
            exec: '??????',
            original: '??????',
            changes: '?????????',
            recursive: '????????????????????????',
            preview: '??????',
            open: '??????',
            these_elements: '??? {{total}} ???',
            new_folder: '????????????',
            download_as_zip: '???ZIP??????'
        });

        $translateProvider.translations('ru', {
            filemanager: '???????????????? ????????????????',
            language: '????????',
            english: '????????????????????',
            spanish: '??????????????????',
            portuguese: '??????????????????????????',
            french: '????????????????????',
            german: '????????????????',
            hebrew: '??????????',
            italian: '??????????????????????',
            slovak: '??????????????????',
            chinese_tw: '???????????????????????? ??????????????????',
            chinese_cn: '???????????????????? ??????????????????',
            russian: '??????????????',
            ukrainian: '????????????????',
            turkish: '????????????????',
            persian: '????????????????????',
            polish: '????????????????',
            confirm: '??????????????????????',
            cancel: '????????????????',
            close: '??????????????',
            upload_files: '???????????????? ????????????',
            files_will_uploaded_to: '?????????? ?????????? ?????????????????? ??: ',
            select_files: '???????????????? ??????????',
            uploading: '????????????????',
            permissions: '????????????????????',
            select_destination_folder: '???????????????? ?????????? ????????????????????',
            source: '????????????????',
            destination: '????????',
            copy_file: '?????????????????????? ????????',
            sure_to_delete: '?????????????????????????? ???????????????',
            change_name_move: '?????????????????????????? / ??????????????????????',
            enter_new_name_for: '?????????? ?????? ??????',
            extract_item: '??????????????',
            extraction_started: '???????????????????? ????????????',
            compression_started: '???????????? ????????????',
            enter_folder_name_for_extraction: '?????????????? ?? ?????????????????? ??????????',
            enter_file_name_for_compression: '?????????????? ?????? ????????????',
            toggle_fullscreen: '???? ???????? ??????????',
            edit_file: '??????????????????????????',
            file_content: '???????????????????? ??????????',
            loading: '????????????????',
            search: '??????????',
            create_folder: '?????????????? ??????????',
            create: '??????????????',
            folder_name: '?????? ??????????',
            upload: '??????????????????',
            change_permissions: '???????????????? ????????????????????',
            change: '????????????????',
            details: '????????????????',
            icons: '????????????',
            list: '????????????',
            name: '??????',
            size: '????????????',
            actions: '????????????????',
            date: '????????',
            selection: '??????????',
            no_files_in_folder: '???????????? ??????????',
            no_folders_in_folder: '???????????? ??????????',
            select_this: '??????????????',
            go_back: '??????????',
            wait: '??????????????????',
            move: '??????????????????????',
            download: '??????????????',
            view_item: '???????????????????? ????????????????????',
            remove: '??????????????',
            edit: '??????????????????????????',
            copy: '??????????????????????',
            rename: '??????????????????????????',
            extract: '??????????????',
            compress: '??????????',
            error_invalid_filename: '?????? ???????????????? ?????? ?????? ????????????????????, ???????????????? ????????????',
            error_modifying: '?????????????????? ???????????? ?????? ?????????????????????????????? ??????????',
            error_deleting: '?????????????????? ???????????? ?????? ????????????????',
            error_renaming: '?????????????????? ???????????? ?????? ???????????????????????????? ??????????',
            error_copying: '?????????????????? ???????????? ?????? ?????????????????????? ??????????',
            error_compressing: '?????????????????? ???????????? ?????? ????????????',
            error_extracting: '?????????????????? ???????????? ?????? ????????????????????',
            error_creating_folder: '?????????????????? ???????????? ?????? ???????????????? ??????????',
            error_getting_content: '?????????????????? ???????????? ?????? ?????????????????? ??????????????????????',
            error_changing_perms: '?????????????????? ???????????? ?????? ?????????????????? ????????????????????',
            error_uploading_files: '?????????????????? ???????????? ?????? ????????????????',
            sure_to_start_compression_with: '?????????????????????????? ??????????',
            owner: '????????????????',
            group: '????????????',
            others: '????????????',
            read: '????????????',
            write: '????????????',
            exec: '????????????????????',
            original: '????-??????????????????',
            changes: '??????????????????',
            recursive: '????????????????????',
            preview: '????????????????',
            open: '??????????????',
            these_elements: '?????????? {{total}} ??????????????????',
            new_folder: '?????????? ??????????',
            download_as_zip: 'Download as ZIP'
        });

        $translateProvider.translations('ua', {
            filemanager: '???????????????? ????????????????',
            language: '????????',
            english: '????????????????????',
            spanish: '??????????????????',
            portuguese: '??????????????????????????',
            french: '????????????????????',
            german: '????????????????',
            hebrew: '??????????',
            italian: '??????????????????????',
            slovak: '??????????????????',
            chinese_tw: '?????????????????????? ????????????????????',
            chinese_cn: 'C?????????????? ??????????????????',
            russian: '????????????????????',
            ukrainian: '??????????????????????',
            turkish: '????????????????',
            persian: '????????????????',
            polish: '????????????????',
            confirm: '??????????????????????',
            cancel: '??????????????????',
            close: '??????????????',
            upload_files: '???????????????????????? ????????????',
            files_will_uploaded_to: '?????????? ???????????? ?????????????????????? ??: ',
            select_files: '???????????????? ??????????',
            uploading: '????????????????????????',
            permissions: '??????????????',
            select_destination_folder: '???????????????? ?????????? ??????????????????????',
            source: '??????????????',
            destination: '????????',
            copy_file: '???????????????????? ????????',
            sure_to_delete: '???????????? ???????????????',
            change_name_move: '?????????????????????????? / ??????????????????????',
            enter_new_name_for: '???????? ????\'?? ??????',
            extract_item: '??????????????',
            extraction_started: '???????????????????? ????????????',
            compression_started: '?????????????????? ????????????',
            enter_folder_name_for_extraction: '?????????????? ?? ?????????????????? ??????????',
            enter_file_name_for_compression: '?????????????? ?????? ????????????',
            toggle_fullscreen: '???? ???????? ??????????',
            edit_file: '????????????????????',
            file_content: '?????????? ??????????',
            loading: '????????????????????????',
            search: '??????????',
            create_folder: '???????????????? ??????????',
            create: '????????????????',
            folder_name: '????\'??  ??????????',
            upload: '??????????????????????',
            change_permissions: '?????????????? ??????????????',
            change: '????????????????????',
            details: '??????????????????????',
            icons: '????????????',
            list: '????????????',
            name: '????\'??',
            size: '????????????',
            actions: '??????',
            date: '????????',
            selection: '??????????',
            no_files_in_folder: '?????????? ??????????',
            no_folders_in_folder: '?????????? ??????????',
            select_this: '??????????????',
            go_back: '??????????',
            wait: '??????????????????',
            move: '??????????????????????',
            download: '??????????????',
            view_item: '???????????????? ??????????',
            remove: '????????????????',
            edit: '????????????????????',
            copy: '??????????????????',
            rename: '??????????????????????????',
            extract: '??????????????????????????',
            compress: '????????????????????',
            error_invalid_filename: '????\'?? ?????????????? ?????? ?????? ??????????, ???????????????? ????????',
            error_modifying: '?????????????? ?????????????? ?????? ?????????????????????? ??????????',
            error_deleting: '?????????????? ?????????????? ?????? ??????????????????',
            error_renaming: '?????????????? ?????????????? ?????? ?????????? ?????????? ??????????',
            error_copying: '?????????????? ?????????????? ?????? ???????????????????? ??????????',
            error_compressing: '?????????????? ?????????????? ?????? ??????????????????',
            error_extracting: '?????????????? ?????????????? ?????? ????????????????????????',
            error_creating_folder: '?????????????? ?????????????? ?????? ?????????????????? ??????????',
            error_getting_content: '?????????????? ?????????????? ?????? ?????????????????? ????????????',
            error_changing_perms: '?????????????? ?????????????? ?????? ?????????? ????????????????',
            error_uploading_files: '?????????????? ?????????????? ?????? ????????????????????????',
            sure_to_start_compression_with: '???????????? ????????????????',
            owner: '??????????????',
            group: '??????????',
            others: '????????',
            read: '??????????????',
            write: '??????????',
            exec: '??????????????????',
            original: '???? ??????????????????????????',
            changes: '??????????',
            recursive: '????????????????????',
            preview: '????????????????',
            open: '????????????????',
            these_elements: '???????????? {{total}} ??????????????????',
            new_folder: '???????? ??????????',
            download_as_zip: 'Download as ZIP'
        });

        $translateProvider.translations('tr', {
            filemanager: 'Dosya Y??neticisi',
            language: 'Dil',
            english: '??ngilizce',
            spanish: '??spanyolca',
            portuguese: 'Portekizce',
            french: 'Frans??zca',
            german: 'Almanca',
            hebrew: '??branice',
            italian: '??talyanca',
            slovak: 'Slovak??a',
            chinese_tw: 'Geleneksel ??in',
            chinese_cn: 'Basitle??tirilmi?? ??ince',
            russian: 'Rus??a',
            ukrainian: 'Ukraynaca',
            turkish: 'T??rk??e',
            persian: 'Fars??a',
            polish: 'Leh??e',
            confirm: 'Onayla',
            cancel: '??ptal Et',
            close: 'Kapat',
            upload_files: 'Dosya y??kle',
            files_will_uploaded_to: 'Dosyalar y??klenecektir.',
            select_files: 'Dosya Se??',
            uploading: 'Y??kleniyor',
            permissions: '??zinler',
            select_destination_folder: 'Hedef klas??r se??in',
            source: 'Kaynak',
            destination: 'Hedef',
            copy_file: 'Dosyay?? kopyala',
            sure_to_delete: 'Silmek istedi??inden emin misin',
            change_name_move: '??smini de??i??tir / ta????',
            enter_new_name_for: 'Yeni ad girin',
            extract_item: 'Dosya ????kar',
            extraction_started: '????karma i??lemi arkaplanda devam ediyor',
            compression_started: 'S??k????t??rma i??lemi arkaplanda ba??lad??',
            enter_folder_name_for_extraction: '????kar??lmas?? i??in klas??r ad?? girin',
            enter_file_name_for_compression: 'S??k????t??r??lmas?? i??in dosya ad?? girin',
            toggle_fullscreen: 'Tam ekran moduna ge??',
            edit_file: 'Dosyay?? d??zenle',
            file_content: 'Dosya i??eri??i',
            loading: 'Y??kleniyor',
            search: 'Ara',
            create_folder: 'Klas??r olu??tur',
            create: 'Olu??tur',
            folder_name: 'Klas??r ad??',
            upload: 'Y??kle',
            change_permissions: '??zinleri de??i??tir',
            change: 'De??i??tir',
            details: 'Detaylar',
            icons: 'simgeler',
            list: 'Liste',
            name: 'Ad??',
            size: 'Boyutu',
            actions: '????lemler',
            date: 'Tarih',
            selection: 'Se??im',
            no_files_in_folder: 'Klas??rde hi?? dosya yok',
            no_folders_in_folder: 'Bu klas??r alt klas??r i??ermez',
            select_this: 'Bunu se??',
            go_back: 'Geri git',
            wait: 'Bekle',
            move: 'Ta????',
            download: '??ndir',
            view_item: 'Dosyay?? g??r??nt??le',
            remove: 'Sil',
            edit: 'D??zenle',
            copy: 'Kopyala',
            rename: 'Yeniden Adland??r',
            extract: '????kart',
            compress: 'S??k????t??r',
            error_invalid_filename: 'Ge??ersiz dosya ad??, bu dosya ad??na sahip dosya mevcut',
            error_modifying: 'Dosya d??zenlenirken bir hata olu??tu',
            error_deleting: 'Klas??r veya dosya silinirken bir hata olu??tu',
            error_renaming: 'Dosya yeniden adland??r??l??rken bir hata olu??tu',
            error_copying: 'Dosya kopyalan??rken bir hata olu??tu',
            error_compressing: 'Dosya veya klas??r s??k????t??r??l??rken bir hata olu??tu',
            error_extracting: '????kart??l??rken bir hata olu??tu',
            error_creating_folder: 'Klas??r olu??turulurken bir hata olu??tu',
            error_getting_content: 'Dosya detaylar?? al??n??rken bir hata olu??tu',
            error_changing_perms: 'Dosyan??n izini de??i??tirilirken bir hata olu??tu',
            error_uploading_files: 'Dosyalar y??klenirken bir hata olu??tu',
            sure_to_start_compression_with: 'S??k????t??rmak istedi??inden emin misin',
            owner: 'Sahip',
            group: 'Grup',
            others: 'Di??erleri',
            read: 'Okuma',
            write: 'Yazma',
            exec: 'Ger??ekle??tir',
            original: 'Orjinal',
            changes: 'De??i??iklikler',
            recursive: 'Yinemeli',
            preview: 'Dosyay?? ??nizle',
            open: 'A??',
            these_elements: '{{total}} eleman',
            new_folder: 'Yeni Klas??r',
            download_as_zip: 'ZIP olarak indir'
        });

        $translateProvider.translations('fa', {
            filemanager: '???????????? ???????? ????',
            language: '????????',
            english: '??????????????',
            spanish: '??????????????????',
            portuguese: '??????????????',
            french: '????????????',
            german: '????????????',
            hebrew: '????????',
            italian: '??????????????????',
            slovak: '????????????',
            chinese_tw: '???????? ????????',
            chinese_cn: '???????? ???????? ??????',
            russian: '????????',
            ukrainian: '????????????????',
            turkish: '????????',
            persian: '??????????',
            polish: '??????????????',
            confirm: '??????????',
            cancel: '????',
            close: '????????',
            upload_files: '?????????? ????????',
            files_will_uploaded_to: '???????? ???? ?????????? ???? ???????? ????',
            select_files: '???????????? ???????? ????',
            uploading: '???? ?????? ??????????',
            permissions: '???????? ????',
            select_destination_folder: '???????? ???????? ???? ???????????? ????????',
            source: '????????',
            destination: '????????',
            copy_file: '?????? ????????',
            sure_to_delete: '?????????? ?????????? ???? ???????????? ?????? ??????????',
            change_name_move: '?????????? ?????? ?? ??????????????',
            enter_new_name_for: '?????? ?????????? ???????? ???????? ????????',
            extract_item: '???????? ???????? ???? ???????? ??????????',
            extraction_started: '???? ?????????? ???? ???? ?????????? ???????? ???? ???????? ???????? ???? ???????? ?????????? ??????',
            compression_started: '???? ?????????? ???? ???? ?????????? ???????? ???? ?????????? ???????? ??????',
            enter_folder_name_for_extraction: '?????? ???????? ???????? ???????? ???????? ???????? ???? ???????? ?????????? ???? ???????? ????????',
            enter_file_name_for_compression: '?????? ???????? ???????? ???????? ?????????? ???????? ???? ???????? ????????',
            toggle_fullscreen: '?????????? ???????? ???????? ????????',
            edit_file: '????????????',
            file_content: '??????????????',
            loading: '???? ?????? ????????????????',
            search: '??????????',
            create_folder: '???????? ????????',
            create: '??????????',
            folder_name: '?????? ????????',
            upload: '??????????',
            change_permissions: '?????????? ???????? ????',
            change: '??????????',
            details: '????????????',
            icons: '?????????? ????',
            list: '????????',
            name: '??????',
            size: '????????',
            actions: '??????????',
            date: '??????????',
            selection: '????????????',
            no_files_in_folder: '?????? ?????????? ???? ?????? ???????? ????????',
            no_folders_in_folder: '?????? ???????? ???? ???????? ?????? ???????? ???????? ??????????',
            select_this: '????????????',
            go_back: '????????????',
            wait: '?????????? ????????????',
            move: '??????????????',
            download: '????????????',
            view_item: '???????????? ?????? ????????',
            remove: '??????',
            edit: '????????????',
            copy: '??????',
            rename: '?????????? ??????',
            extract: '???????? ???? ???????? ??????????',
            compress: '?????????? ????????',
            error_invalid_filename: '?????? ???????? ???????? ???????? ???????? ?? ???? ???????? ?????????????? ?????? ???????? ???????? ?????? ?????????? ???????? ????????',
            error_modifying: '???? ?????????? ?????????? ???????? ?????????? ?????? ??????',
            error_deleting: '???? ?????????? ?????? ???????? ?????????? ?????? ??????',
            error_renaming: '???? ?????????? ?????????? ?????? ???????? ?????????? ?????? ??????',
            error_copying: '???? ?????????? ?????? ???????? ???????? ?????????? ?????? ??????',
            error_compressing: '???? ?????????? ?????????? ???????? ???????? ?????????? ?????? ??????',
            error_extracting: '???? ?????????? ???????? ???????? ???????? ???? ???????? ?????????? ?????????? ?????? ??????',
            error_creating_folder: '???? ?????????? ???????? ???????? ?????????? ?????? ??????',
            error_getting_content: '???? ?????????? ???????????????? ?????????????? ???????? ?????????? ???? ??????',
            error_changing_perms: '???? ?????????? ?????????? ???????? ?????? ???????? ?????????? ???? ??????',
            error_uploading_files: '???? ?????????? ???????? ?????????? ???? ??????',
            sure_to_start_compression_with: '?????????? ?????????? ?????????? ???????? ?????????? ??????',
            owner: '???????? ????????',
            group: '????????',
            others: '????????????',
            read: '????????????',
            write: '??????????',
            exec: '???????? ????????',
            original: '????????',
            changes: '??????????????',
            recursive: '??????????????',
            preview: '?????? ??????????',
            open: '?????? ????????',
            these_elements: '?????????? {{total}} ????????',
            new_folder: '???????? ????????',
            download_as_zip: '???? ?????????? ???????? ?????????? ???????????? ??????'
        });

        $translateProvider.translations('pl', {
            filemanager: 'Menad??er plik??w',
            language: 'J??zyk',
            english: 'Angielski',
            spanish: 'Hiszpa??ski',
            portuguese: 'Portugalski',
            french: 'Francuski',
            german: 'Niemiecki',
            hebrew: 'Hebrajski',
            italian: 'W??oski',
            slovak: 'S??owacki',
            chinese_tw: 'Tradycyjny Chi??ski',
            chinese_cn: 'Chi??ski Uproszczony',
            russian: 'Rosyjski',
            ukrainian: 'Ukrai??ski',
            turkish: 'Turecki',
            persian: 'Perski',
            polish: 'Polski',
            confirm: 'Potwierd??',
            cancel: 'Anuluj',
            close: 'Zamknij',
            upload_files: 'Wgraj pliki',
            files_will_uploaded_to: 'Pliki b??d?? umieszczone w katalogu',
            select_files: 'Wybierz pliki',
            uploading: '??adowanie',
            permissions: 'Uprawnienia',
            select_destination_folder: 'Wybierz folder docelowy',
            source: '??r??d??o',
            destination: 'Cel',
            copy_file: 'Kopiuj plik',
            sure_to_delete: 'Jeste?? pewien, ??e chcesz skasowa??',
            change_name_move: 'Zmie?? nazw?? / przenie??',
            enter_new_name_for: 'Wpisz now?? nazw?? dla',
            extract_item: 'Rozpakuj element',
            extraction_started: 'Rozpakowywanie rozpocz????o si?? w tle',
            compression_started: 'Kompresowanie rozpocz????o si?? w tle',
            enter_folder_name_for_extraction: 'Wpisz nazw?? folderu do rozpakowania',
            enter_file_name_for_compression: 'Wpisz nazw?? folderu do skompresowania',
            toggle_fullscreen: 'Tryb pe??noekranowy',
            edit_file: 'Edytuj plik',
            file_content: 'Zawarto???? pliku',
            loading: '??adowanie',
            search: 'Szukaj',
            create_folder: 'Stw??rz folder',
            create: 'Utw??rz',
            folder_name: 'Nazwa folderu',
            upload: 'Wgraj',
            change_permissions: 'Zmie?? uprawnienia',
            change: 'Zmie??',
            details: 'Szczeg????y',
            icons: 'Ikony',
            list: 'Lista',
            name: 'Nazwa',
            size: 'Rozmiar',
            actions: 'Akcje',
            date: 'Data',
            selection: 'Zaznaczone',
            no_files_in_folder: 'Brak plik??w w tym folderze',
            no_folders_in_folder: 'Ten folder nie zawiera podfolder??w',
            select_this: 'Wybierz ten',
            go_back: 'W g??r??',
            wait: 'Wait',
            move: 'Przenie??',
            download: 'Pobierz',
            view_item: 'Wy??wietl',
            remove: 'Usu??',
            edit: 'Edycja',
            copy: 'Kopiuj',
            rename: 'Zmie?? nazw??',
            extract: 'Rozpakuj',
            compress: 'Skompresuj',
            error_invalid_filename: 'B????dna nazwa pliku lub plik o takiej nazwie ju?? istnieje, prosz?? u??y?? innej nazwy',
            error_modifying: 'Wyst??pi?? b????d podczas modyfikowania pliku',
            error_deleting: 'Wyst??pi?? b????d podczas usuwania pliku lub folderu',
            error_renaming: 'Wyst??pi?? b????d podczas zmiany nazwy pliku',
            error_copying: 'Wyst??pi?? b????d podczas kopiowania pliku',
            error_compressing: 'Wyst??pi?? b????d podczas kompresowania pliku lub folderu',
            error_extracting: 'Wyst??pi?? b????d podczas rozpakowywania pliku',
            error_creating_folder: 'Wyst??pi?? b????d podczas tworzenia nowego folderu',
            error_getting_content: 'Wyst??pi?? b????d podczas pobierania zawarto??ci pliku',
            error_changing_perms: 'Wyst??pi?? b????d podczas zmiany uprawnie?? pliku',
            error_uploading_files: 'Wyst??pi?? b????d podczas wgrywania plik??w',
            sure_to_start_compression_with: 'Jeste?? pewien, ??e chcesz skompresowa??',
            owner: 'W??a??ciciel',
            group: 'Grupa',
            others: 'Inni',
            read: 'Odczyt',
            write: 'Zapis',
            exec: 'Wykonywanie',
            original: 'Orygina??',
            changes: 'Zmiany',
            recursive: 'Rekursywnie',
            preview: 'Podgl??d elementu',
            open: 'Otw??rz',
            these_elements: 'te {{total}} elementy?',
            new_folder: 'Nowy folder',
            download_as_zip: 'Pobierz jako ZIP'
        });

        $translateProvider.translations('it', {
            filemanager: 'Gestore File',
            language: 'Lingua',
            english: 'Inglese',
            spanish: 'Spagnolo',
            portuguese: 'Portoghese',
            french: 'Francese',
            german: 'Tedesco',
            hebrew: 'Ebraico',
            slovak: 'Slovacco',
            chinese_tw: 'Cinese Tradizionale',
            chinese_cn: 'Cinese',
            russian: 'Russo',
            ukrainian: 'Ucraino',
            turkish: 'Turco',
            persian: 'Persiano',
            polish: 'Polacco',
            confirm: 'Conferma',
            cancel: 'Annulla',
            close: 'Chiudi',
            upload_files: 'Carica files',
            files_will_uploaded_to: 'I files saranno caricati in',
            select_files: 'Seleziona i files',
            uploading: 'Trasferimento',
            permissions: 'Permessi',
            select_destination_folder: 'Select carterlla di destinazione',
            source: 'Sorgente',
            destination: 'Destinazione',
            copy_file: 'Copia file',
            sure_to_delete: 'Sicuro di voler eliminare',
            change_name_move: 'Rinomina / sposta',
            enter_new_name_for: 'Inserisci nuovo nome per',
            extract_item: 'Estrai elemento',
            extraction_started: 'Decompressione avviata da un processo in background',
            compression_started: 'Compressione avviata da un processo in background',
            enter_folder_name_for_extraction: 'Inserisci nome cartella per l\'estrazione di',
            enter_file_name_for_compression: 'Inserisci nome file per la compressione di',
            toggle_fullscreen: 'Passa a schermo intero',
            edit_file: 'Modifica file',
            file_content: 'Contenuto del file',
            loading: 'Caricamento',
            search: 'Cerca',
            create_folder: 'Crea cartella',
            create: 'Crea',
            folder_name: 'Nome cartella',
            upload: 'Upload',
            change_permissions: 'Modifica permessi',
            change: 'Modifica',
            details: 'Dettagli',
            icons: 'Icone',
            list: 'Lista',
            name: 'Nome',
            size: 'Dimensione',
            actions: 'Azioni',
            date: 'Data',
            selection: 'Selezione',
            no_files_in_folder: 'Nessun file nella cartella',
            no_folders_in_folder: 'Questa cartella non contiene altre cartelle',
            select_this: 'Seleziona questo',
            go_back: 'Indietro',
            wait: 'Attendere',
            move: 'Sposta',
            download: 'Scarica',
            view_item: 'Visualizza elemento',
            remove: 'Elimina',
            edit: 'Modifica',
            copy: 'Copia',
            rename: 'Rinomina',
            extract: 'Estrai',
            compress: 'Comprimi',
            error_invalid_filename: 'Nome file non valido o gi?? esistente, specificarne un\'altro',
            error_modifying: 'Errore durante la modifica del file',
            error_deleting: 'Errore durante l\'eliminazione del file o della cartella',
            error_renaming: 'Errore durante la rinomina del file',
            error_copying: 'Errore durante la copia del file',
            error_compressing: 'Errore durante la compressione del file o della cartella',
            error_extracting: 'Errore durante l\'estrazione del file',
            error_creating_folder: 'Errore nella creazione della cartella',
            error_getting_content: 'Errore nel recupero del contenuto del file',
            error_changing_perms: 'Errore durante la modifica dei permessi del file',
            error_uploading_files: 'Errore durante il trasferimento dei files',
            sure_to_start_compression_with: 'Sicuro di voler comprimere',
            owner: 'Proprietario',
            group: 'Gruppo',
            others: 'Altri',
            read: 'Lettura',
            write: 'Scrittura',
            exec: 'Esecuzione',
            original: 'Originario',
            changes: 'Cambiamenti',
            recursive: 'Ricorsivo',
            preview: 'Anteprima',
            open: 'Apri',
            these_elements: 'questi {{total}} elementi',
            new_folder: 'Nuova cartella',
            download_as_zip: 'Scarica come file ZIP'
        });

    }]);
})(angular);

(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').controller('FileManagerCtrl', [
    angular.module('angularApp').controller('FileManagerCtrl', [
        '$scope', '$rootScope', '$window', '$translate', 'fileManagerConfig', 'item', 'fileNavigator', 'apiMiddleware',
        function($scope, $rootScope, $window, $translate, fileManagerConfig, Item, FileNavigator, ApiMiddleware) {

        var $storage = $window.localStorage;
        $scope.config = fileManagerConfig;
        $scope.reverse = false;
        $scope.predicate = ['model.type', 'model.name'];
        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
            $scope.predicate[1] = predicate;
        };
        $scope.query = '';
        $scope.fileNavigator = new FileNavigator();
        $scope.apiMiddleware = new ApiMiddleware();
        $scope.uploadFileList = [];
        $scope.viewTemplate = $storage.getItem('viewTemplate') || 'main-icons.html';
        $scope.fileList = [];
        $scope.temps = [];

        $scope.$watch('temps', function() {
            if ($scope.singleSelection()) {
                $scope.temp = $scope.singleSelection();
            } else {
                $scope.temp = new Item({rights: 644});
                $scope.temp.multiple = true;
            }
            $scope.temp.revert();
        });

        $scope.fileNavigator.onRefresh = function() {
            $scope.temps = [];
            $scope.query = '';
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
        };

        $scope.setTemplate = function(name) {
            $storage.setItem('viewTemplate', name);
            $scope.viewTemplate = name;
        };

        $scope.changeLanguage = function (locale) {
            if (locale) {
                $storage.setItem('language', locale);
                return $translate.use(locale);
            }
            $translate.use($storage.getItem('language') || fileManagerConfig.defaultLang);
        };

        $scope.isSelected = function(item) {
            return $scope.temps.indexOf(item) !== -1;
        };

        $scope.selectOrUnselect = function(item, $event) {
            var indexInTemp = $scope.temps.indexOf(item);
            var isRightClick = $event && $event.which == 3;

            if ($event && $event.target.hasAttribute('prevent')) {
                $scope.temps = [];
                return;
            }
            if (! item || (isRightClick && $scope.isSelected(item))) {
                return;
            }
            if ($event && $event.shiftKey && !isRightClick) {
                var list = $scope.fileList;
                var indexInList = list.indexOf(item);
                var lastSelected = $scope.temps[0];
                var i = list.indexOf(lastSelected);
                var current = undefined;
                if (lastSelected && list.indexOf(lastSelected) < indexInList) {
                    $scope.temps = [];
                    while (i <= indexInList) {
                        current = list[i];
                        !$scope.isSelected(current) && $scope.temps.push(current);
                        i++;
                    }
                    return;
                }
                if (lastSelected && list.indexOf(lastSelected) > indexInList) {
                    $scope.temps = [];
                    while (i >= indexInList) {
                        current = list[i];
                        !$scope.isSelected(current) && $scope.temps.push(current);
                        i--;
                    }
                    return;
                }
            }
            if ($event && !isRightClick && ($event.ctrlKey || $event.metaKey)) {
                $scope.isSelected(item) ? $scope.temps.splice(indexInTemp, 1) : $scope.temps.push(item);
                return;
            }
            $scope.temps = [item];
        };

        $scope.singleSelection = function() {
            return $scope.temps.length === 1 && $scope.temps[0];
        };

        $scope.totalSelecteds = function() {
            return {
                total: $scope.temps.length
            };
        };

        $scope.selectionHas = function(type) {
            return $scope.temps.find(function(item) {
                return item && item.model.type === type;
            });
        };

        $scope.prepareNewFolder = function() {
            var item = new Item(null, $scope.fileNavigator.currentPath);
            $scope.temps = [item];
            return item;
        };

        $scope.smartClick = function(item) {
            var pick = $scope.config.allowedActions.pickFiles;
            if (item.isFolder()) {
                return $scope.fileNavigator.folderClick(item);
            }

            if (typeof $scope.config.pickCallback === 'function' && pick) {
                var callbackSuccess = $scope.config.pickCallback(item.model);
                if (callbackSuccess === true) {
                    return;
                }
            }

            if (item.isImage()) {
                if ($scope.config.previewImagesInModal) {
                    return $scope.openImagePreview(item);
                }
                return $scope.apiMiddleware.download(item, true);
            }

            if (item.isEditable()) {
                return $scope.openEditItem(item);
            }
        };

        $scope.openImagePreview = function() {
            var item = $scope.singleSelection();
            $scope.apiMiddleware.apiHandler.inprocess = true;
            $scope.modal('imagepreview', null, true)
                .find('#imagepreview-target')
                .attr('src', $scope.getUrl(item))
                .unbind('load error')
                .on('load error', function() {
                    $scope.apiMiddleware.apiHandler.inprocess = false;
                    $scope.$apply();
                });
            // Modification Start
            $scope.closeFileManager();
            // Modification End
        };

        $scope.openEditItem = function() {
            var item = $scope.singleSelection();
            $scope.apiMiddleware.getContent(item).then(function(data) {
                item.tempModel.content = item.model.content = data.result;
            });
            $scope.modal('edit');
        };

        $scope.modal = function(id, hide, returnElement) {
            var element = angular.element('#' + id);
            element.modal(hide ? 'hide' : 'show');
            $scope.apiMiddleware.apiHandler.error = '';
            $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            return returnElement ? element : true;
        };

        $scope.modalWithPathSelector = function(id) {
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
            return $scope.modal(id);
        };

        $scope.isInThisPath = function(path) {
            var currentPath = $scope.fileNavigator.currentPath.join('/') + '/';
            return currentPath.indexOf(path + '/') !== -1;
        };

        $scope.edit = function() {
            $scope.apiMiddleware.edit($scope.singleSelection()).then(function() {
                $scope.modal('edit', true);
            });
        };

        $scope.changePermissions = function() {
            $scope.apiMiddleware.changePermissions($scope.temps, $scope.temp).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('changepermissions', true);
            });
        };

        $scope.download = function() {
            var item = $scope.singleSelection();
            if ($scope.selectionHas('dir')) {
                return;
            }
            if (item) {
                return $scope.apiMiddleware.download(item);
            }
            return $scope.apiMiddleware.downloadMultiple($scope.temps);
        };

        $scope.copy = function() {
            var item = $scope.singleSelection();
            if (item) {
                var name = item.tempModel.name.trim();
                var nameExists = $scope.fileNavigator.fileNameExists(name);
                if (nameExists && validateSamePath(item)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
                if (!name) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
            }
            $scope.apiMiddleware.copy($scope.temps, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('copy', true);
            });
        };

        $scope.compress = function() {
            var name = $scope.temp.tempModel.name.trim();
            var nameExists = $scope.fileNavigator.fileNameExists(name);

            if (nameExists && validateSamePath($scope.temp)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            if (!name) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }

            $scope.apiMiddleware.compress($scope.temps, name, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                if (! $scope.config.compressAsync) {
                    return $scope.modal('compress', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.extract = function() {
            var item = $scope.temp;
            var name = $scope.temp.tempModel.name.trim();
            var nameExists = $scope.fileNavigator.fileNameExists(name);

            if (nameExists && validateSamePath($scope.temp)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            if (!name) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }

            $scope.apiMiddleware.extract(item, name, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                if (! $scope.config.extractAsync) {
                    return $scope.modal('extract', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.remove = function() {
            $scope.apiMiddleware.remove($scope.temps).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('remove', true);
            });
        };

        $scope.move = function() {
            var anyItem = $scope.singleSelection() || $scope.temps[0];
            if (anyItem && validateSamePath(anyItem)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_move_same_path');
                return false;
            }
            $scope.apiMiddleware.move($scope.temps, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('move', true);
            });
        };

        $scope.rename = function() {
            var item = $scope.singleSelection();
            var name = item.tempModel.name;
            var samePath = item.tempModel.path.join('') === item.model.path.join('');
            if (!name || (samePath && $scope.fileNavigator.fileNameExists(name))) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            $scope.apiMiddleware.rename(item).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('rename', true);
            });
        };

        $scope.createFolder = function() {
            var item = $scope.singleSelection();
            var name = item.tempModel.name;
            if (!name || $scope.fileNavigator.fileNameExists(name)) {
                return $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
            }
            $scope.apiMiddleware.createFolder(item).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('newfolder', true);
            });
        };

        $scope.addForUpload = function($files) {
            $scope.uploadFileList = $scope.uploadFileList.concat($files);
            $scope.modal('uploadfile');
        };

        $scope.removeFromUpload = function(index) {
            $scope.uploadFileList.splice(index, 1);
        };

        $scope.uploadFiles = function() {
            $scope.apiMiddleware.upload($scope.uploadFileList, $scope.fileNavigator.currentPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.uploadFileList = [];
                $scope.modal('uploadfile', true);
            }, function(data) {
                var errorMsg = data.result && data.result.error || $translate.instant('error_uploading_files');
                $scope.apiMiddleware.apiHandler.error = errorMsg;
            });
        };

        $scope.getUrl = function(_item) {
            return $scope.apiMiddleware.getUrl(_item);
        };

        var validateSamePath = function(item) {
            var selectedPath = $rootScope.selectedModalPath.join('');
            var selectedItemsPath = item && item.model.path.join('');
            return selectedItemsPath === selectedPath;
        };

        var getQueryParam = function(param) {
            var found = $window.location.search.substr(1).split('&').filter(function(item) {
                return param ===  item.split('=')[0];
            });
            return found[0] && found[0].split('=')[1] || undefined;
        };

        $scope.changeLanguage(getQueryParam('lang'));
        $scope.isWindows = getQueryParam('server') === 'Windows';
        $scope.fileNavigator.refresh();

    }]);
})(angular);

(function(angular) {
    'use strict';
    // angular.module('FileManagerApp').controller('ModalFileManagerCtrl', 
    angular.module('angularApp').controller('ModalFileManagerCtrl', 
        ['$scope', '$rootScope', 'fileNavigator', function($scope, $rootScope, FileNavigator) {

        $scope.reverse = false;
        $scope.predicate = ['model.type', 'model.name'];
        $scope.fileNavigator = new FileNavigator();
        $rootScope.selectedModalPath = [];

        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
            $scope.predicate[1] = predicate;
        };

        $scope.select = function(item) {
            $rootScope.selectedModalPath = item.model.fullPath().split('/').filter(Boolean);
            $scope.modal('selector', true);
        };

        $scope.selectCurrent = function() {
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
            $scope.modal('selector', true);
        };

        $scope.selectedFilesAreChildOfPath = function(item) {
            var path = item.model.fullPath();
            return $scope.temps.find(function(item) {
                var itemPath = item.model.fullPath();
                if (path == itemPath) {
                    return true;
                }
                /*
                if (path.startsWith(itemPath)) {
                    fixme names in same folder like folder-one and folder-one-two
                    at the moment fixed hidding affected folders
                }
                */
            });
        };

        $rootScope.openNavigator = function(path) {
            $scope.fileNavigator.currentPath = path;
            $scope.fileNavigator.refresh();
            $scope.modal('selector');
        };

        $rootScope.getSelectedPath = function() {
            var path = $rootScope.selectedModalPath.filter(Boolean);
            var result = '/' + path.join('/');
            if ($scope.singleSelection() && !$scope.singleSelection().isFolder()) {
                result += '/' + $scope.singleSelection().tempModel.name;
            }
            return result.replace(/\/\//, '/');
        };

    }]);
})(angular);
