(function () {

    angular.module('katGui.services')
        .service('UserLogService', UserLogService);

    function UserLogService($http, $q, $rootScope, $window, $log, $filter, $timeout, NotifyService, $mdDialog, $sce, MOMENT_DATETIME_FORMAT, DATETIME_FORMAT) {

        function urlBase() {
            return $rootScope.portalUrl? $rootScope.portalUrl + '/katcontrol/userlogs' : '';
        }

        var api = {};
        api.userlogs = [];
        api.tags = [];
        api.tagsMap = {};
        api.taxonomies = [];
        api.logFiles = [];
        api.mandatoryTagsList = ['shift', 'time-loss', 'observation', 'status', 'maintenance'];
        api.mandatoryTagsListString = api.mandatoryTagsList.join(', ');

        //TODO rename this method to something better
        api.populateUserlogTagsFromMap = function (userlog) {
            var tagIds = JSON.parse(userlog.tags);
            userlog.tags = [];
            for (var i = 0; i < tagIds.length; i++) {
                userlog.tags.push(api.tagsMap[tagIds[i]]);
            }
            userlog.tags = _.sortBy(userlog.tags, 'name');
            if (userlog.tags) {
                userlog.tagsListText = userlog.tags.map(function (tag) {
                    return tag.name;
                }).join(',');
            }
            return userlog;
        };

        api.listUserLogsForTimeRange = function (start, end) {
            var deferred = $q.defer();
            var query = '?start_time=' + start + '&end_time=' + end;
            $http(createRequest('get', urlBase() + '/query' + query)).then(
                function (result) {
                    if (result && result.data) {
                        result.data.forEach(function (userlog) {
                            if (_.findIndex(api.userlogs, {id: userlog.id}) === -1) {
                                api.userlogs.push(api.populateUserlogTagsFromMap(userlog));
                            }
                        });
                        deferred.resolve(result.data);
                    } else {
                        $log.error('Could not retrieve any users.');
                        deferred.reject(result);
                    }
                }, function (error) {
                    NotifyService.showHttpErrorDialog('Could not retrieve any userlogs', error);
                    deferred.reject(error);
                });
            return deferred.promise;
        };

        api.listTags = function () {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/tags')).then(
                function (result) {
                    if (result && result.data) {
                        api.tags.splice(0, api.tags.length);
                        result.data.forEach(function (tag) {
                            api.tagsMap[tag.id] = tag;
                            api.tags.push(tag);
                        });
                        deferred.resolve();
                    } else {
                        $log.error('Could not retrieve any tags.');
                        deferred.reject();
                    }
                }, function (error) {
                    NotifyService.showHttpErrorDialog('Could not retrieve any tags', error);
                    deferred.reject();
                });
            return deferred.promise;
        };

        api.listTaxonomies = function () {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/taxonomies')).then(
                function (result) {
                    if (result && result.data) {
                        api.taxonomies.splice(0, api.taxonomies.length);
                        result.data.forEach(function (taxonomy) {
                            api.taxonomies.push(taxonomy);
                        });
                        deferred.resolve();
                    } else {
                        $log.error('Could not retrieve any taxonomies.');
                        deferred.reject();
                    }
                }, function (error) {
                    NotifyService.showHttpErrorDialog('Could not retrieve any tags', error);
                    deferred.reject();
                });
            return deferred.promise;
        };

        api.queryUserLogs = function (query) {
            var query_uri = encodeURI(query);
            var defer = $q.defer();
            $http(createRequest('get', urlBase() + '/query' + query_uri)).then(
                function (result) {
                    defer.resolve(result);
                }, function (result) {
                    NotifyService.showHttpErrorDialog("Could not retrieve any userlogs", result);
                    defer.reject(result);
                });
            return defer.promise;
        };

        api.queryActivityLogs = function (query) {
            var query_uri = encodeURI(query);
            var defer = $q.defer();
            $http(createRequest('get', urlBase() + '/activity' + query_uri)).then(
                function (result) {
                    defer.resolve(result);
                }, function (error) {
                    NotifyService.showHttpErrorDialog("Could not retrieve any activity logs", error);
                    defer.reject(error);
                });
            return defer.promise;
        };

        api.getLogFiles = function () {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/log-files')).then(
                function (result) {
                    if (result && result.data) {
                        api.logFiles.splice(0, api.logFiles.length);
                        result.data.forEach(function (logFile) {
                            api.logFiles.push(logFile);
                        });
                        deferred.resolve(api.logFiles);
                    } else {
                        $log.error('Could not retrieve the list of log files.');
                        deferred.reject();
                    }
                }, function (error) {
                    NotifyService.showHttpErrorDialog('Could not retrieve the list of log files.', error);
                    deferred.reject();
                });
            return deferred.promise;
        };

        api.queryLogFiles = function (logFiles, start_time, end_time) {
            var defer = $q.defer();
            var searchQuery = {
                file_names: logFiles,
                start_time: start_time,
                end_time: end_time
            };
            $http(createRequest('post', urlBase() + '/search-logs', searchQuery)).then(
                function (result) {
                    defer.resolve(result);
                }, function (error) {
                    NotifyService.showHttpErrorDialog("Error searching log files", error);
                    defer.reject(error);
                });
            return defer.promise;
        };

        api.uploadFileToUrl = function (file, userlog_id) {
            var defer = $q.defer();
            var formData = new FormData();
            for (var i = 0; i < file.length; i++) {
                formData.append('filedata[]', file[i]);
            }
            var options = {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined,
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };
            $http.post(urlBase() + '/' + userlog_id + '/attachments', formData, options).then(
                function (result) {
                    defer.resolve(result);
                    NotifyService.showSimpleToast("Uploaded files successfully.");
                }, function (error) {
                    NotifyService.showHttpErrorDialog("Could not upload files", error);
                    defer.reject(error);
                });
            return defer.promise;
        };

        api.getFileFromUrl = function (file_name, file_alias, userlog_id) {
            var options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                },
                responseType: 'blob'
            };
            $http.get(urlBase() + '/' + userlog_id + '/attachments/' + file_name, options).then(
                function (result) {
                    var blob = result.data;
                    var url = $window.URL || $window.webkitURL;
                    var file_url = url.createObjectURL(blob);
                    var downloadLink = angular.element('<a></a>');
                    downloadLink.attr('href', file_url);
                    downloadLink.attr('download', file_alias);
                    downloadLink[0].click();
                    url.revokeObjectURL(file_url);
                }, function () {
                    $log.error(urlBase() + '/get/attach');
                });
        };

        api.addUserLog = function (log) {
            var defer = $q.defer();
            var newUserLog = {
                user: log.user,
                start_time: log.start_time,
                end_time: log.end_time,
                content: log.content,
                tag_ids: log.tag_ids
            };
            $http(createRequest('post', urlBase(), newUserLog)).then(
                function (result) {
                    NotifyService.showSimpleToast("Log Created.");
                    defer.resolve(result);
                }, function (error) {
                    NotifyService.showHttpErrorDialog("Error creating user log", error);
                    defer.reject(error);
                });
            return defer.promise;
        };

        api.modifyUserLog = function (ulog) {
            var defer = $q.defer();
            var modifiedUserLog = {
                start_time: ulog.start_time,
                end_time: ulog.end_time,
                content: ulog.content,
                tag_ids: ulog.tag_ids,
                metadata: ulog.metadata
            };
            $http(createRequest('post', urlBase() + '/' + ulog.id, modifiedUserLog)).then(
                function (result) {
                    NotifyService.showSimpleToast("Edited userlog " + result.data.id);
                    defer.resolve(result);
                }, function (error) {
                    NotifyService.showHttpErrorDialog("Error editing user log", error);
                    defer.reject(error);
                });
            return defer.promise;
        };

        api.modifyTag = function (tag) {
            var defer = $q.defer();
            var modifiedTag = {
                name: tag.name,
                slug: tag.slug,
                activated: tag.activated
            };
            $http(createRequest('post', urlBase() + '/tags/modify/' + tag.id, modifiedTag)).then(
                function (result) {
                    NotifyService.showSimpleToast("Modified tag " + tag.id + ".");
                    defer.resolve(result);
                }, function (result) {
                    NotifyService.showHttpErrorDialog("Error modifying tag", result);
                    defer.reject(result);
                });
            return defer.promise;
        };

        api.createTag = function (tag) {
            var defer = $q.defer();
            var newTag = {
                name: tag.name,
                slug: tag.slug,
                activated: tag.activated
            };
            $http(createRequest('post', urlBase() + '/tags/add', newTag)).then(
                function (result) {
                    tag.id = result.data.id;
                    tag.name = tag.name;
                    tag.slug = tag.slug;
                    api.tags.push(tag);
                    NotifyService.showSimpleToast("Created tag " + tag.name + " id:" + result.data.id + ".");
                    defer.resolve(result);
                }, function (result) {
                    NotifyService.showHttpErrorDialog("Error creating tag", result);
                    defer.reject(result);
                });
            return defer.promise;
        };

        function createRequest(method, url, data) {
            var req = {
                method: method,
                url: url,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };
            if ((data && method === 'post') || (data && method === 'put')) {
                req.headers['Content-Type'] = 'application/json';
                req.data = data;
            }
            return req;
        }

        api.receivedUserlogMessage = function (messageChannel, messageData) {
            var userlog;
            if (messageChannel === 'userlogs:add') {
                var index = _.findIndex(api.userlogs, {id: parseInt(messageData.id)});
                if (index > -1) {
                    api.userlogs.splice(index, 1);
                }
                $rootScope.$apply(function () {
                    api.userlogs.push(api.populateUserlogTagsFromMap(messageData));
                    $rootScope.$emit('userlogs_add', api.userlogs[api.userlogs.length - 1]);
                });
            } else if (messageChannel === 'userlogs:modify') {
                var userlogIndex = _.findIndex(api.userlogs, {id: parseInt(messageData.parent_id)});
                userlog = api.userlogs[userlogIndex];
                if (userlog) {
                    $rootScope.$apply(function () {
                        userlog.id = messageData.id;
                        userlog.parent_id = messageData.parent_id;
                        userlog.start_time = messageData.start_time;
                        userlog.end_time = messageData.end_time;
                        userlog.tags = messageData.tags;
                        userlog.content = messageData.content;
                        userlog.attachments = messageData.attachments;
                        userlog.attachment_count = messageData.attachment_count;
                        api.userlogs.splice(userlogIndex, 1);
                        api.userlogs.push(api.populateUserlogTagsFromMap(messageData));
                        $rootScope.$emit('userlogs_modify', api.userlogs[api.userlogs.length - 1]);
                    });
                }
            } else if (messageChannel === 'userlogs:metadata_upload') {
                userlog = _.findWhere(api.userlogs, {id: messageData[0].userlog_id});
                if (userlog) {
                    $rootScope.$apply(function () {
                        userlog.attachments = messageData;
                        userlog.attachment_count = messageData.length;
                    });
                }
            } else {
                $log.error('Dangling Userlogs message: ' + messageData);
            }
        };

        api.editUserLog = function (log, editMode, focusTarget, event) {
            var defer = $q.defer();
            $mdDialog
                .show({
                    controller: function ($rootScope, $scope, $mdDialog, $filter, $log) {
                        $scope.editMode = editMode;
                        $scope.log = log;
                        $scope.tags = api.tags;
                        $scope.start_time = log.start_time;
                        $scope.end_time = log.end_time;
                        $scope.content = log.content;
                        $scope.selectedTags = [];
                        $scope.attachments = log.attachments;
                        $scope.uploadingFiles = false;
                        $scope.validTags = true;
                        $scope.mandatoryTagsListString = api.mandatoryTagsListString;
                        $scope.showInvalidTagsTooltip = false;
                        $scope.openedWithoutEndTime = log.end_time !== null && log.end_time.length > 0;
                        $scope.chipHasBeenAdded = false;
                        $scope.focusTarget = focusTarget? focusTarget: 'userlogDialogStartTimeElement';

                        $timeout(function () {
                            var parentElement = document.querySelector('#' + focusTarget);
                            var focusedChild = false;
                            var childTargets = ['input', 'textarea'];
                            for (var i = 0; i < childTargets.length; i++) {
                                var childElement = parentElement.querySelector(childTargets[i]);
                                if (childElement) {
                                    childElement.focus();
                                    focusedChild = true;
                                    break;
                                }
                            }
                            if (!focusedChild) {
                                parentElement.focus();
                            }
                        }, 1250);

                        for (var i = 0; i < log.tags.length; i++) {
                            var existingTag = _.findWhere(api.tags, {id: log.tags[i].id});
                            if (existingTag) {
                                $scope.selectedTags.push(existingTag);
                            } else {
                                $log.error('Could not find existing tag for ' + log.tags[i]);
                            }
                        }

                        $scope.tagsChanged = function (initStep) {
                            var containsMandatoryTags = false;
                            for (var i = 0; i < $scope.selectedTags.length; i++) {
                                if (api.mandatoryTagsList.indexOf($scope.selectedTags[i].name.toLowerCase()) > -1) {
                                    containsMandatoryTags = true;
                                    break;
                                }
                            }
                            if (!initStep) {
                                $scope.chipHasBeenAdded = true;
                                $scope.validTags = containsMandatoryTags || !editMode;
                                $scope.showInvalidTagsTooltip = !$scope.validTags;
                            } else {
                                // wait a while before we indicate that we there are missing mandatory tags
                                // in the init step the dialog is still animating its location, so this
                                // tooltip will end up in the middle of no where if we don't wait for the
                                // translating animation to finish
                                $timeout(function () {
                                    $scope.validTags = containsMandatoryTags || !editMode;
                                    $scope.showInvalidTagsTooltip = !$scope.validTags;
                                }, 1000);
                            }
                        };

                        $scope.tagsChanged(true);

                        $scope.verifyDateTimeString = function (input) {
                            return moment.utc(input, MOMENT_DATETIME_FORMAT, true).isValid();
                        };

                        $scope.verifyDateTimeInputs = function () {
                            $scope.validStartTime = $scope.verifyDateTimeString($scope.start_time);
                            $scope.validEndTime = $scope.verifyDateTimeString($scope.end_time) || $scope.end_time === '';
                            return $scope.validStartTime && $scope.validEndTime;
                        };
                        $scope.verifyDateTimeInputs();

                        $scope.addTagFromList = function (listedTag) {
                            if (!_.findWhere($scope.selectedTags, {id: listedTag.id})) {
                                $scope.selectedTags.push(listedTag);
                            }
                        };

                        $scope.hide = function () {
                            $scope.showInvalidTagsTooltip = false;
                            $mdDialog.hide();
                            defer.resolve();
                        };

                        $scope.submit = function () {
                            var newTagList = [];
                            $scope.selectedTags.forEach(function (tag) {
                                newTagList.push(tag);
                            });

                            var newLog = {
                                id: log.id,
                                user: $rootScope.currentUser.id,
                                start_time: $scope.start_time,
                                end_time: $scope.end_time,
                                content: $scope.content,
                                metadata: $scope.attachments
                            };
                            var tagIdList = [];
                            newTagList.forEach(function (tag) {
                                tagIdList.push(tag.id);
                            });

                            if (newLog.id) {
                                newLog.tag_ids = tagIdList;
                                if ($scope.filesToUpload) {
                                    $scope.uploadingFiles = true;
                                    api.modifyUserLog(newLog).then(function (result) {
                                            var modified_userlog_id = result.data.id;
                                            api.uploadFileToUrl($scope.filesToUpload, modified_userlog_id).then(function () {
                                                $scope.uploadingFiles = false;
                                                $mdDialog.hide();
                                                defer.resolve();
                                            });
                                        });

                                } else {
                                    api.modifyUserLog(newLog).then(function () {
                                        $mdDialog.hide();
                                        defer.resolve();
                                    });
                                }
                            } else {
                                newLog.tag_ids = tagIdList;
                                if ($scope.filesToUpload) {
                                    $scope.uploadingFiles = true;
                                    api.addUserLog(newLog).then(function (result) {
                                            var new_userlog_id = result.data.id;
                                            api.uploadFileToUrl($scope.filesToUpload, new_userlog_id).then(function () {
                                                $scope.uploadingFiles = false;
                                                $mdDialog.hide();
                                                defer.resolve();
                                            });
                                        });

                                } else {
                                    api.addUserLog(newLog).then(function () {
                                        $mdDialog.hide();
                                        defer.resolve();
                                    });
                                }
                            }
                        };

                        $scope.querySearch = function (query) {
                            var results = query ? $scope.tags.filter($scope.createFilterFor(query)) : [];
                            return results;
                        };

                        $scope.createFilterFor = function (query) {
                            return function filterFn(tag) {
                                return (tag.name.toLowerCase().indexOf(query.toLowerCase()) === 0);
                            };
                        };

                        $scope.onTimeSet = function (value, attribute) {
                            $scope[attribute] = $filter('date')(value, DATETIME_FORMAT);
                            if (!$scope.end_time || $scope.start_time <= $scope.end_time) {
                                $scope.endDateTimeError = false;
                            } else {
                                $scope.endDateTimeError = true;
                            }
                            $scope.verifyDateTimeInputs();
                        };

                        $scope.onTimeChange = function () {
                            if (!$scope.end_time || $scope.start_time <= $scope.end_time) {
                                $scope.endDateTimeError = false;
                            } else {
                                $scope.endDateTimeError = true;
                            }
                            $scope.verifyDateTimeInputs();
                        };

                        $scope.downloadFile = function(attachment) {
                            api.getFileFromUrl(attachment.value, attachment.name, log.id);
                        };
                    },
                    templateUrl: 'app/userlogs/userlogdialog.tmpl.html',
                    targetEvent: event
                });
            return defer.promise;
        };

        return api;
    }

})();
