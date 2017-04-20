(function() {

    angular.module('katGui.services')
        .service('ObsSchedService', ObsSchedService);

    function ObsSchedService($rootScope, $http, ConfigService, KatGuiUtil,
        UserLogService, $log, $q, $mdDialog, NotifyService,
        $timeout, $interval, $localStorage) {

        function urlBase() {
            return $rootScope.portalUrl ? $rootScope.portalUrl + '/katcontrol' : '';
        }
        var api = {};
        if (!$localStorage.lastKnownSubarrayConfig) {
            $localStorage.lastKnownSubarrayConfig = {};
        }
        api.lastKnownSubarrayConfig = $localStorage.lastKnownSubarrayConfig;
        api.scheduleDraftData = [];
        api.scheduleCompletedData = [];
        api.programBlocks = [];
        api.subarrays = [];
        api.poolResourcesFree = [];
        api.configLabels = [];
        api.resourceTemplates = [];
        api.observationSchedule = [];
        api.scheduleData = [];
        api.guiUrlsRaw = [];
        api.guiUrls = {};
        api.resourcesStates = {};
        api.draftArrayStates = ['DRAFT', 'DEFINED', 'APPROVED'];

        api.handleRequestResponse = function(request, defer) {
            var deferred;
            if (defer) {
                deferred = $q.defer();
            }
            request
                .then(function(result) {
                    if (!result.data.error) {
                        var message = KatGuiUtil.sanitizeKATCPMessage(result.data.result);
                        if (result.data.result.split(' ')[1] === 'ok') {
                            if (deferred) {
                                deferred.resolve();
                            }
                            NotifyService.showSimpleToast(message);
                        } else {
                            if (deferred) {
                                deferred.reject();
                            }
                            NotifyService.showPreDialog('Error Processing Request', message);
                        }
                    } else {
                        if (deferred) {
                            deferred.reject();
                        }
                        NotifyService.showPreDialog('Error Processing Request', result.data.error);
                    }
                }, function(error) {
                    if (deferred) {
                        deferred.resolve(false);
                    }
                    NotifyService.showHttpErrorDialog('Error sending request', error);
                });
            if (deferred) {
                return deferred.promise;
            }
        };

        api.markResourceFaulty = function(resource, faulty) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/resource/' + resource + '/faulty/' + faulty)));
            var tags = [];
            tags.push(_.find(UserLogService.tags, function(item) {
                return item.name === 'status';
            }));
            var tagResource = _.find(UserLogService.tags, function(item) {
                return item.name === resource;
            });
            if (tagResource) {
                tags.push(tagResource);
            }
            if (faulty === 'set') {
                var content = 'Marking resource ' + resource + ' as faulty.';
                var newlog = {
                    start_time: $rootScope.utcDateTime,
                    end_time: '',
                    tags: tags,
                    user_id: $rootScope.currentUser.id,
                    content: content
                };
                UserLogService.editUserLog(newlog, true);
            }
        };

        api.markResourceInMaintenance = function(resource, maintenance) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/resource/' + resource + '/maintenance/' + maintenance)));
            var tags = [];
            tags.push(_.find(UserLogService.tags, function(item) {
                return item.name === 'maintenance';
            }));
            var tagResource = _.find(UserLogService.tags, function(item) {
                return item.name === resource;
            });
            if (tagResource) {
                tags.push(tagResource);
            }

            if (maintenance === 'set') {
                var content = 'Setting resource ' + resource + ' in maintenance.';
                var newlog = {
                    start_time: $rootScope.utcDateTime,
                    end_time: '',
                    tags: tags,
                    user_id: $rootScope.currentUser.id,
                    content: content
                };
                UserLogService.editUserLog(newlog, true);
            }
        };

        api.restartMaintenanceDevice = function(sub_nr, resource, device) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/resource/' + resource + '/device/' + device + '/restart')));
        };

        api.listResourceMaintenanceDevices = function(resource) {
            return $http(createRequest('get', urlBase() + '/resource/' + resource + '/maintenance-device-list'));
        };

        api.deleteScheduleDraft = function(id) {
            $http(createRequest('post', urlBase() + '/sb/' + id + '/delete')).then(function(result) {
                if (result.data.error) {
                    NotifyService.showSimpleDialog('Error deleting Schedule Block', result.data.error);
                } else {
                    NotifyService.showSimpleToast(result.data.result);
                }
            }, function(error) {
                NotifyService.showHttpErrorDialog('Error sending request', error.data.message);
            });
        };

        api.scheduleDraft = function(sub_nr, id) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id + '/schedule')));
        };

        api.scheduleToApproved = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/to-approved')));
        };

        api.scheduleToComplete = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/complete')));
        };

        api.verifyScheduleBlock = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/verify')));
        };

        api.executeSchedule = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/execute')));
        };

        api.stopSchedule = function(sub_nr, id_code) {
            NotifyService.showImportantConfirmDialog(null, 'Stop Executing Schedule', 'Are you sure you want to stop executing ' + id_code + '?', 'Yes', 'Cancel').then(function() {
                api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/stop')));
            }, function() {
                NotifyService.showSimpleToast('Cancelled stop executing ' + id_code);
            });
        };

        api.cancelExecuteSchedule = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/cancel-execute')));
        };

        api.updateScheduleBlockWithProgramBlockID = function(sb, pb) {
            var body = {};
            if (pb && pb.pb_id) {
                body = {
                    pb_id: pb.pb_id
                };
            }
            return $http(createRequest('post', urlBase() + '/sb/' + sb.id_code + '/update-pb-id', body));
        };

        api.cloneSBIntoPB = function(sb, pb) {
            return $http(createRequest('post', urlBase() + '/sb/' + sb.id_code + '/clone', {
                pb_id: pb.pb_id
            }));
        };

        api.cloneSB = function(id_code) {
            return $http(createRequest('post', urlBase() + '/sb/' + id_code + '/clone'));
        };

        api.clonePB = function(pb, cloneSBs) {
            return $http(createRequest('post', urlBase() + '/pb/' + pb.pb_id + '/clone/' + (cloneSBs ? '1' : '0')));
        };

        api.cloneAndAssignSB = function(id_code, sub_nr) {
            api.cloneSB(id_code).then(function(result) {
                if (result.data.result) {
                    api.assignScheduleBlock(sub_nr, result.data.result.id_code);
                } else {
                    NotifyService.showPreDialog('Error Processing Request', 'Could not clone schedule block.');
                }
            }, function(error) {
                NotifyService.showHttpErrorDialog('Error sending request', error);
            });
        };

        api.cloneAndScheduleSB = function(id_code, sub_nr) {
            api.cloneSB(id_code).then(function(result) {
                if (result.data.result) {
                    api.scheduleDraft(sub_nr, result.data.result.id_code);
                } else {
                    NotifyService.showPreDialog('Error Processing Request', 'Could not clone and assign schedule block.');
                }
            }, function(error) {
                NotifyService.showHttpErrorDialog('Error sending request', error);
            });
        };

        api.assignScheduleBlock = function(sub_nr, id_code) {
            return api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/assign')), true);
        };

        api.unassignScheduleBlock = function(sub_nr, id_code) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/sb/' + sub_nr + '/' + id_code + '/unassign')));
        };

        api.assignResourcesToSubarray = function(sub_nr, resources) {
            return api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/assign-resource/' + resources)), true);
        };

        api.unassignResourcesFromSubarray = function(sub_nr, resources) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/unassign-resource/' + resources)));
        };

        api.activateSubarray = function(sub_nr) {
            return $http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/activate'), true);
        };

        api.setSubarrayMaintenance = function(sub_nr, maintenance) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/maintenance/' + maintenance)));
        };

        api.freeSubarray = function(sub_nr) {
            return api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/free')), true);
        };

        api.getScheduleBlocks = function() {
            //TODO smoothly combine the existing list with the new list so that there isnt a screen flicker
            api.scheduleDraftData.splice(0, api.scheduleDraftData.length);
            $http(createRequest('get', urlBase() + '/sb/approved'))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    for (var i in jsonResult) {
                        if (api.draftArrayStates.indexOf(jsonResult[i].state) > -1) {
                            api.scheduleDraftData.push(jsonResult[i]);
                        }
                    }
                }, function(error) {
                    $log.error(error);
                });
        };

        api.getProgramBlocks = function() {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/pb'))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    var newPBIds = [];
                    for (var i in jsonResult) {
                        var existingPBIndex = _.findIndex(api.programBlocks, {
                            pb_id: jsonResult[i].pb_id
                        });
                        if (existingPBIndex > -1) {
                            //Update existing program blocks
                            api.programBlocks.splice(existingPBIndex, 1);
                        }
                        api.programBlocks.push(jsonResult[i]);
                        newPBIds.push(jsonResult[i].pb_id);
                    }
                    //Remove old program blocks that has had a state change
                    var existingPBIDs = api.programBlocks.map(function(pb) {
                        return pb.pb_id;
                    });
                    var PBIDsToRemove = _.difference(existingPBIDs, newPBIds);
                    PBIDsToRemove.forEach(function(pbID) {
                        var existingPBIndex = _.findIndex(api.programBlocks, function(pb) {
                            return pb.pb_id === pbID;
                        });
                        if (existingPBIndex > -1) {
                            api.programBlocks.splice(existingPBIndex, 1);
                        }
                    });

                    deferred.resolve(api.programBlocks);
                }, function(error) {
                    $log.error(error);
                    deferred.reject(error);
                });
            return deferred.promise;
        };

        api.getScheduleBlockDetails = function(idCodes) {
            return $http(createRequest('post',
                urlBase() + '/sb/details', {
                    id_codes: idCodes.join(',')
                }));
        };

        api.getProgramBlocksObservationSchedule = function() {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/pb/observation-schedule'))
                .then(function(result) {
                    api.observationSchedule.splice(0, api.observationSchedule.length);
                    var jsonResult = JSON.parse(result.data.result);
                    jsonResult.forEach(function(jsonItem) {
                        api.observationSchedule.push(jsonItem);
                    });
                    deferred.resolve(api.observationSchedule);
                }, function(error) {
                    $log.error(error);
                    deferred.reject(error);
                });
            return deferred.promise;
        };

        api.getScheduledScheduleBlocks = function() {
            var deferred = $q.defer();
            $http(createRequest('get', urlBase() + '/sb/scheduled'))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    var newScheduleDataIdCodes = [];
                    for (var i in jsonResult) {
                        var existingSbIndex = _.findIndex(api.scheduleData, {
                            id_code: jsonResult[i].id_code
                        });
                        if (existingSbIndex > -1) {
                            //Update existing schedule blocks
                            api.scheduleData.splice(existingSbIndex, 1);
                        }
                        api.scheduleData.push(jsonResult[i]);
                        newScheduleDataIdCodes.push(jsonResult[i].id_code);
                    }
                    //Remove old schedule blocks that has had a state change
                    var existingSbIdCodes = api.scheduleData.map(function(sb) {
                        return sb.id_code;
                    });
                    var sbIdCodesToRemove = _.difference(existingSbIdCodes, newScheduleDataIdCodes);
                    sbIdCodesToRemove.forEach(function(sbIdCode) {
                        var existingSbIndex = _.findIndex(api.scheduleData, function(sb) {
                            return sb.id_code === sbIdCode;
                        });
                        if (existingSbIndex > -1) {
                            api.scheduleData.splice(existingSbIndex, 1);
                        }
                    });

                    deferred.resolve(api.scheduleData);
                }, function(error) {
                    $log.error(error);
                    deferred.reject(error);
                });
            return deferred.promise;
        };

        api.throttleGetProgramBlocksObservationSchedule = _.throttle(api.getProgramBlocksObservationSchedule, 300);

        api.getCompletedScheduleBlocks = function(sub_nr, max_nr) {
            //TODO smoothly combine the existing list with the new list so that there isnt a screen flicker
            api.scheduleCompletedData.splice(0, api.scheduleCompletedData.length);
            $http(createRequest('get', urlBase() + '/sb/completed/' + sub_nr + '/' + max_nr))
                .then(function(result) {
                    var jsonResult = JSON.parse(result.data.result);
                    for (var i in jsonResult) {
                        api.scheduleCompletedData.push(jsonResult[i]);
                    }
                }, function(error) {
                    $log.error(error);
                });
        };

        api.setSchedulerModeForSubarray = function(sub_nr, mode) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/sched-mode/' + mode)));
        };

        api.updateScheduleDraft = function(scheduleBlockDraft) {
            return $http(createRequest('post', urlBase() + '/sb/' + scheduleBlockDraft.id_code, {
                id_code: scheduleBlockDraft.id_code,
                type: scheduleBlockDraft.type,
                instruction_set: scheduleBlockDraft.instruction_set,
                description: scheduleBlockDraft.description,
                desired_start_time: scheduleBlockDraft.desired_start_time
            }));
        };

        api.receivedResourceMessage = function(sensor) {
            var sensorName = sensor.name;

            if (sensorName.startsWith('subarray_')) {
                var subarrayIndex = _.findIndex(api.subarrays, function(item) {
                    return item.id === sensorName.split('_')[1];
                });
                if (subarrayIndex === -1) {
                    api.subarrays.push({
                        id: sensorName.split('_')[1]
                    });
                    subarrayIndex = api.subarrays.length - 1;
                }
                if (subarrayIndex > -1) {
                    var trimmedSensorName = sensorName.replace('subarray_' + api.subarrays[subarrayIndex].id + '_', '');
                    if (sensorName.endsWith('allocations')) {
                        var parsedAllocations = sensor.value !== "" ? JSON.parse(sensor.value) : [];
                        if (!api.subarrays[subarrayIndex].allocations) {
                            api.subarrays[subarrayIndex].allocations = [];
                        } else {
                            api.subarrays[subarrayIndex].allocations.splice(0, api.subarrays[subarrayIndex].allocations.length);
                        }
                        if (parsedAllocations.length > 0) {
                            for (var m in parsedAllocations) {
                                api.subarrays[subarrayIndex].allocations.push({
                                    name: parsedAllocations[m][0],
                                    allocation: parsedAllocations[m][1]
                                });
                            }
                        }
                    } else if (sensorName.endsWith('delegated_ca')) {
                        api.subarrays[subarrayIndex][trimmedSensorName] = sensor.value;
                        var iAmCA;
                        for (var idx in api.subarrays) {
                            if (api.subarrays[idx]['delegated_ca'] === $rootScope.currentUser.email) {
                                iAmCA = true;
                            }
                        }
                        $rootScope.iAmCA = iAmCA && $rootScope.currentUser.req_role === 'control_authority';
                    } else {
                        api.subarrays[subarrayIndex][trimmedSensorName] = sensor.value;
                        if (sensorName.endsWith('pool_resources')) {
                            $rootScope.$emit('subarrayPoolResourcesSensorUpdate', sensor);
                        }
                        if (sensorName.endsWith('state')) {
                            //wait a while to make sure on initial load that we get all the subarray sensor values
                            $timeout(function() {
                                if (api.subarrays[subarrayIndex].state !== 'inactive') {
                                    $localStorage.lastKnownSubarrayConfig['subarray_' + api.subarrays[subarrayIndex].id] = {
                                        allocations: api.subarrays[subarrayIndex].allocations.map(function(resource) {
                                            return resource.name;
                                        }).join(","),
                                        band: api.subarrays[subarrayIndex].band,
                                        product: api.subarrays[subarrayIndex].product
                                    };
                                    api.throttlePopulateGUIUrls();
                                }
                            }, 1000);
                        }
                    }
                } else {
                    $log.error('Unknown subarray sensor value: ');
                    $log.error(sensor.value);
                }
            } else if (sensorName.endsWith('pool_resources_free')) {
                api.poolResourcesFree.splice(0, api.poolResourcesFree.length);
                var resourcesList = sensor.value.split(',');
                if (resourcesList.length > 0 && resourcesList[0] !== '') {
                    for (var index in resourcesList) {
                        api.poolResourcesFree.push({
                            name: resourcesList[index]
                        });
                    }
                }
            } else if (sensorName.endsWith('_state')) {
                var component = sensorName.split('_state')[0];
                api.resourcesStates[component] = sensor;
            } else if (sensorName.indexOf('mode_') > -1) {
                var subarrayId = sensorName.split('_')[2];
                var subarray = _.findWhere(api.subarrays, {
                    id: subarrayId
                });
                if (subarray) {
                    subarray.mode = sensor.value;
                }
            } else {
                var trimmed = sensorName.replace('katpool_', '');
                api[trimmed] = sensor.value;
            }
        };

        api.populateGUIUrls = function() {
            $http(createRequest('get', $rootScope.portalUrl + '/katmonitor/sensor-list/gui.urls')).then(function(result) {
                api.guiUrlsRaw = result.data;
                api.guiUrlsRaw.forEach(function (guiUrls) {
                    var resourceName = guiUrls.name.split('.')[0];
                    if (guiUrls.value.length > 0) {
                        // can't JSON parse empty strings
                        guiUrls.value = JSON.parse(guiUrls.value);
                        if (!api.guiUrls[resourceName]) {
                            api.guiUrls[resourceName] = guiUrls;
                        } else {
                            guiUrls.value.forEach(function (guiUrl) {
                                var existingUrlIndex = _.findIndex(api.guiUrls[resourceName].value, {title: guiUrl.title});
                                if (existingUrlIndex > -1) {
                                    api.guiUrls[resourceName].value[existingUrlIndex] = guiUrl;
                                } else {
                                    api.guiUrls[resourceName].value.push(guiUrl);
                                }
                            });
                        }
                    }
                });
            }, function(error) {
                $log.error('Could not retrieve gui urls! ' + error);
            });
        };

        api.throttlePopulateGUIUrls = _.throttle(api.populateGUIUrls, 1000);

        api.receivedScheduleMessage = function(message) {
            var obj = message.value;
            var commandList = message.command.split(' ');
            var table = commandList[0];
            var action = commandList[1];
            var id_to_action = commandList[2];
            if (table === 'schedule_block') {
                api.receivedSBMessage(obj, action, id_to_action);
            } else {
                api.receivedPBMessage(obj, action, id_to_action);
            }
            api.debounceRootScopeSafeDigest();
        };

        api.receivedPBMessage = function(pb, action, id_to_action) {
            var pbDataToAdd = [];
            var orderChangeCall = false;

            if (action === 'delete') {
                var obsIndex = _.findLastIndex(api.observationSchedule, {
                    id: parseInt(id_to_action)
                });
                if (obsIndex > -1) {
                    api.observationSchedule.splice(obsIndex, 1);
                    orderChangeCall = true;
                }

                var index = _.findLastIndex(api.programBlocks, {
                    id: parseInt(id_to_action)
                });
                if (index > -1) {
                    NotifyService.showSimpleToast('PB ' + api.programBlocks[index].pb_id + ' has been removed');
                    api.programBlocks.splice(index, 1);
                }
            } else if (action === 'update') {
                var pbObsIndex = _.findLastIndex(api.observationSchedule, {
                    id: pb.id
                });
                if (pbObsIndex > -1) {
                    pb.schedule_blocks = api.observationSchedule[pbObsIndex].schedule_blocks;
                    pb.sub_nr = api.observationSchedule[pbObsIndex].sub_nr;
                    api.observationSchedule[pbObsIndex] = pb;
                    orderChangeCall = true;
                }

                var pbIndex = _.findLastIndex(api.programBlocks, {
                    id: pb.id
                });
                if (pbIndex > -1) {
                    pb.schedule_blocks = api.programBlocks[pbIndex].schedule_blocks;
                    api.programBlocks[pbIndex] = pb;
                } else {
                    api.programBlocks.push(pb);
                }
            } else if (action === 'insert') {
                orderChangeCall = true;
                api.programBlocks.push(pb);
                NotifyService.showSimpleToast('PB ' + pb.pb_id + ' has been added.');
            } else {
                $log.error('Dangling ObsSchedService ' + action + ' message for:');
                $log.error(pb);
            }
            if (orderChangeCall) {
                api.throttleGetProgramBlocksObservationSchedule();
            }
        };

        api.updateProgramBlocksWithUpdatedSb = function(sb) {
            if (sb.pb_id) {
                var pbIndex = _.findLastIndex(api.programBlocks, {
                    id: sb.pb_id
                });
                if (pbIndex > -1) {
                    //SB could've moved from one pb to another
                    api.programBlocks.forEach(function(pb, existingIndex) {
                        var sbIndex = _.findLastIndex(pb.schedule_blocks, {
                            id: sb.id
                        });
                        if (sbIndex > -1) {
                            api.programBlocks[existingIndex].schedule_blocks.splice(sbIndex, 1);
                        }
                    });
                    if (!sb.deleted) {
                        api.programBlocks[pbIndex].schedule_blocks.push(sb);
                    }
                } else {
                    $log.warning('Trying to update program blocks with sb.pb_id: ' + sb.pb_id +
                        ', but could not find any program blocks with that id!');
                }
            } else if (!sb.pb_id) {
                api.programBlocks.forEach(function(pb) {
                    var sbIndex = _.findLastIndex(pb.schedule_blocks, {
                        id: sb.id
                    });
                    if (sbIndex > -1) {
                        pb.schedule_blocks.splice(sbIndex, 1);
                    }
                });
            }
        };

        api.receivedSBMessage = function(sb, action, id_to_action) {
            // TODO update observationSchedule
            var scheduleDataToAdd = [];
            var draftDataToAdd = [];
            var completedDataToAdd = [];
            var orderChangeCall = false;

            if (action === 'delete') {
                //only drafts can be deleted in the db
                var index = _.findLastIndex(api.scheduleDraftData, {
                    id: parseInt(id_to_action)
                });
                if (index > -1) {
                    NotifyService.showSimpleToast('SB ' + api.scheduleDraftData[index].id_code + ' has been removed');
                    if (api.scheduleDraftData[index].pb_id) {
                        api.scheduleDraftData[index].deleted = true;
                        api.updateProgramBlocksWithUpdatedSb(api.scheduleDraftData[index]);
                    }
                    api.scheduleDraftData.splice(index, 1);
                }
            } else if (action === 'update') {
                var draftIndex = _.findLastIndex(api.scheduleDraftData, {
                    id: sb.id
                });
                var scheduledIndex = _.findLastIndex(api.scheduleData, {
                    id: sb.id
                });

                if (api.draftArrayStates.indexOf(sb.state) > -1) {
                    if (draftIndex > -1) {
                        api.scheduleDraftData[draftIndex] = sb;
                    } else if (draftIndex === -1) {
                        //sb needs to be moved from scheduled to drafts
                        if (scheduledIndex > -1) {
                            api.scheduleData.splice(scheduledIndex, 1);
                            $rootScope.$emit('sb_schedule_remove', sb);
                            orderChangeCall = true;
                        }
                        draftDataToAdd.push(sb);
                        orderChangeCall = true;
                    }

                } else if (sb.state === 'SCHEDULED' || sb.state === 'ACTIVE') {
                    if (scheduledIndex > -1) {
                        api.scheduleData[scheduledIndex] = sb;
                        $rootScope.$emit('sb_schedule_update', sb);

                    } else if (scheduledIndex === -1 && draftIndex > -1) {
                        api.scheduleDraftData.splice(draftIndex, 1);
                    }
                    // always call order change when this happens
                    // because it means that the states of sb's changed
                    orderChangeCall = true;
                } else {
                    var completedIndex = _.findLastIndex(api.scheduleCompletedData, {
                        id: sb.id
                    });
                    if (completedIndex > -1) {
                        api.scheduleCompletedData[completedIndex] = sb;
                    } else if (scheduledIndex > -1) {
                        api.scheduleData.splice(scheduledIndex, 1);
                        completedDataToAdd.push(sb);
                        orderChangeCall = true;
                    } else if (draftIndex > -1) {
                        api.scheduleDraftData.splice(draftIndex, 1);
                        completedDataToAdd.push(sb);
                    } else {
                        completedDataToAdd.push(sb);
                    }
                    orderChangeCall = true;
                }
                api.updateProgramBlocksWithUpdatedSb(sb);
            } else if (action === 'insert') {
                if (api.draftArrayStates.indexOf(sb.state) > -1) {
                    draftDataToAdd.push(sb);
                } else if (sb.state === 'ACTIVE' || sb.state === 'SCHEDULED') {
                    scheduleDataToAdd.push(sb);
                    $rootScope.$emit('sb_schedule_insert', sb);
                } else {
                    completedDataToAdd.push(sb);
                }
                if (sb.pb_id) {
                    api.updateProgramBlocksWithUpdatedSb(sb);
                }
                NotifyService.showSimpleToast('SB ' + sb.id_code + ' has been added.');
            } else {
                $log.error('Dangling ObsSchedService ' + action + ' message for:');
                $log.error(sb);
            }

            if (scheduleDataToAdd.length) {
                Array.prototype.push.apply(api.scheduleData, scheduleDataToAdd);
            }
            if (draftDataToAdd.length) {
                Array.prototype.push.apply(api.scheduleDraftData, draftDataToAdd);
            }
            if (completedDataToAdd.length) {
                Array.prototype.push.apply(api.scheduleCompletedData, completedDataToAdd);
            }
            if (orderChangeCall) {
                api.throttleGetProgramBlocksObservationSchedule();
            }
        };

        api.debounceRootScopeSafeDigest = _.debounce(rootScopeSafeDigest, 1000);

        function rootScopeSafeDigest() {
            if (!$rootScope.$$phase) {
                $rootScope.$digest();
            }
        }

        api.listConfigLabels = function() {
            api.configLabels.splice(0, api.configLabels.length);
            $http(createRequest('get', urlBase() + '/config-labels'))
                .then(function(result) {
                    var configLabels = JSON.parse(result.data);
                    configLabels.forEach(function(item) {
                        api.configLabels.push(item);
                    });
                }, function(error) {
                    $log.error(error);
                });
        };

        api.setConfigLabel = function(sub_nr, config_label) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/config-labels/' + sub_nr + '/' + config_label)));
        };

        api.setBand = function(sub_nr, band) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/bands/' + sub_nr + '/' + band)));
        };

        api.setProduct = function(sub_nr, product) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/products/' + sub_nr + '/' + product)));
        };

        api.delegateControl = function(sub_nr, userName) {
            api.handleRequestResponse($http(createRequest('post', urlBase() + '/subarray/' + sub_nr + '/delegate-control/' + userName)));
        };

        api.viewTaskLogForSBIdCode = function(id_code, mode) {
            if (ConfigService.GetKATTaskFileServerURL()) {
                window.open(ConfigService.GetKATTaskFileServerURL() + "/tailtask/" + id_code + "/" + mode).focus();
            } else {
                NotifyService.showSimpleDialog('Error Viewing Progress', 'There is no KATTaskFileServer IP defined in config, please contact CAM support.');
            }
        };

        api.showSubarrayLogs = function(sub_nr) {
            if (ConfigService.GetKATTaskFileServerURL()) {
                window.open(ConfigService.GetKATLogFileServerURL() + "/logfile/kat.katsubarray" + sub_nr + ".log/tail/");
            } else {
                NotifyService.showSimpleDialog('Error Viewing Logfile', 'There is no KATTaskFileServer IP defined in config, please contact CAM support.');
            }
        };

        api.showResourceLogs = function(resourceName) {
            if (ConfigService.GetKATTaskFileServerURL()) {
                window.open(ConfigService.GetKATLogFileServerURL() + "/logfile/kat." + resourceName + ".log/tail/");
            } else {
                NotifyService.showSimpleDialog('Error Viewing Logfile', 'There is no KATTaskFileServer IP defined in config, please contact CAM support.');
            }
        };

        api.listResourceMaintenanceDevicesDialog = function(sub_nr, resource, event) {
            $mdDialog
                .show({
                    controller: function($rootScope, $scope, $mdDialog) {
                        $scope.title = 'Select a device in ' + resource + ' to restart';
                        $scope.devices = [];
                        api.listResourceMaintenanceDevices(resource)
                            .then(function(result) {
                                var resultList = JSON.parse(result.data.result.replace(/\"/g, '').replace(/\'/g, '"'));
                                for (var i in resultList) {
                                    $scope.devices.push(resultList[i]);
                                }
                            }, function(error) {
                                $log.error(error);
                            });

                        $scope.hide = function() {
                            $mdDialog.hide();
                        };
                        $scope.restartMaintenanceDevice = function(device) {
                            api.restartMaintenanceDevice(sub_nr, resource, device);
                        };
                    },
                    template: '<md-dialog style="padding: 0;" md-theme="{{$root.themePrimary}}">' +
                        '   <div style="padding: 0; margin: 0; overflow: auto" layout="column">' +
                        '       <md-toolbar class="md-primary" layout="row" layout-align="center center">' +
                        '           <span flex style="margin: 16px;">{{::title}}</span>' +
                        '       </md-toolbar>' +
                        '       <div flex layout="column">' +
                        '           <div layout="row" layout-align="center center" ng-repeat="device in devices track by $index">' +
                        '               <md-button style="margin: 0" flex title="Restart {{device}} Device"' +
                        '                   ng-click="restartMaintenanceDevice(device); $event.stopPropagation()">' +
                        '                   <span style="margin-right: 8px;" class="fa fa-refresh"></span>' +
                        '                   <span>{{device}}</span>' +
                        '               </md-button>' +
                        '           </div>' +
                        '       </div>' +
                        '       <div layout="row" layout-align="end" style="margin-top: 8px; margin-right: 8px; margin-bottom: 8px; min-height: 40px;">' +
                        '           <md-button style="margin-left: 8px;" class="md-primary md-raised" md-theme="{{$root.themePrimaryButtons}}" aria-label="OK" ng-click="hide()">Close</md-button>' +
                        '       </div>' +
                        '   </div>' +
                        '</md-dialog>',
                    targetEvent: event
                });
        };

        api.listResourceTemplates = function() {
            api.resourceTemplates.splice(0, api.resourceTemplates.length);
            $http.get(urlBase() + '/subarray/template/list')
                .then(function(result) {
                    result.data.forEach(function(item) {
                        api.resourceTemplates.push(item);
                    });
                }, function(error) {
                    $log.error(error);
                });
        };

        api.loadResourceTemplate = function(subarray, template) {
            if (ConfigService.systemConfig.system.bands.indexOf(template.band) === -1) {
                $log.error('Could not set band ' + template.band + '.');
            } else if (subarray.band !== template.band) {
                api.setBand(subarray.id, template.band);
            }

            if (subarray.product !== template.product) {
                api.setProduct(subarray.id, template.product);
            }

            api.assignResourcesToSubarray(subarray.id, template.resources);
        };

        api.addResourceTemplate = function(template) {
            $http(createRequest('post',
                    urlBase() + '/subarray/template/add', {
                        name: template.name,
                        owner: $rootScope.currentUser.email,
                        resources: template.resources,
                        band: template.band,
                        product: template.product
                    }))
                .then(function(result) {
                    api.resourceTemplates.push(result.data);
                    NotifyService.showSimpleToast("Created resource template");
                }, function(error) {
                    NotifyService.showHttpErrorDialog('Error creating resource template', error);
                });
        };

        api.modifyResourceTemplate = function(template) {
            $http(createRequest('post',
                    urlBase() + '/subarray/template/modify/' + template.id, {
                        name: template.name,
                        owner: $rootScope.currentUser.email,
                        resources: template.resources,
                        band: template.band,
                        product: template.product,
                        activated: template.activated
                    }))
                .then(function(result) {
                    var oldResource = _.findWhere(api.resourceTemplates, {
                        id: template.id
                    });
                    oldResource = result.data;
                    NotifyService.showSimpleToast("Modified resource template");
                }, function(error) {
                    NotifyService.showHttpErrorDialog('Error modifying resource template', error);
                });
        };

        api.sbProgress = function(sb) {
            var startDate = moment.utc(sb.actual_start_time);
            var startDateTime = startDate.toDate().getTime();
            var endDate = moment.utc(startDate).add(sb.expected_duration_seconds, 'seconds');
            var now = moment.utc(new Date());
            return (now.toDate().getTime() - startDateTime) / (endDate.toDate().getTime() - startDateTime) * 100;
        };

        api.getLastKnownSubarrayConfig = function(subarrayNumber) {
            api.lastKnownSubarrayConfig['subarray_' + subarrayNumber] = $localStorage.lastKnownSubarrayConfig['subarray_' + subarrayNumber];
            return api.lastKnownSubarrayConfig['subarray_' + subarrayNumber];
        };

        api.loadLastKnownSubarrayConfig = function(subarrayNumber) {
            var lastKnownConfig = $localStorage.lastKnownSubarrayConfig['subarray_' + subarrayNumber];
            if (lastKnownConfig) {
                var subarray = _.find(api.subarrays, function(item) {
                    return item.id === subarrayNumber;
                });
                if (lastKnownConfig.allocations) {
                    var currentAllocations = subarray.allocations.map(function(resource) {
                        return resource.name;
                    });
                    var resourcesToAllocate = lastKnownConfig.allocations.split(',');
                    var resourcesGoingToAllocate = _.difference(resourcesToAllocate, currentAllocations);
                    if (resourcesGoingToAllocate.length > 0) {
                        api.assignResourcesToSubarray(subarrayNumber, resourcesGoingToAllocate.join(','));
                    }
                }
                if (subarray.band !== lastKnownConfig.band) {
                    api.setBand(subarrayNumber, lastKnownConfig.band);
                }
                if (subarray.product !== lastKnownConfig.product) {
                    api.setProduct(subarrayNumber, lastKnownConfig.product);
                }
            }
        };

        api.setupSubarrayFromPB = function(subarrayNumber, pb_id, event) {
            $http(createRequest('post', urlBase() + '/subarray/' + subarrayNumber + '/setup/' + pb_id))
                .then(function(result) {
                    NotifyService.showSetupSubarrayDialog(
                        event, "Setup Subarray " + subarrayNumber + " results", result.data.results, subarrayNumber);
                }, function(error) {
                    $log.info(error);
                    NotifyService.showHttpErrorDialog('Error setting up subarray from PB', error);
                });
        };

        api.updateSBOrderingValues = function(id_code, lead_operator_priority, sb_order, sb_sequence) {
            return $http(createRequest('post',
                urlBase() + '/sb/' + id_code + '/order', {
                    lead_operator_priority: lead_operator_priority,
                    sb_order: sb_order,
                    sb_sequence: sb_sequence,
                }));
        };

        api.updatePBOrderingValues = function(pb_id, director_priority, pb_order, pb_sequence) {
            return $http(createRequest('post',
                urlBase() + '/pb/' + pb_id + '/order', {
                    director_priority: director_priority,
                    pb_order: pb_order,
                    pb_sequence: pb_sequence,
                }));
        };

        api.progressInterval = $interval(function() {
            if (api.observationSchedule.length > 0) {
                api.observationSchedule.forEach(function(pb) {
                    pb.schedule_blocks.forEach(function(sb) {
                        if (sb.state === 'ACTIVE' && sb.expected_duration_seconds && sb.actual_start_time) {
                            sb.progress = api.sbProgress(sb);
                        }
                    });
                });
            }
        }, 3000);

        function createRequest(method, url, data) {
            var req = {
                method: method,
                url: url,
                headers: {
                    'Authorization': 'CustomJWT ' + $rootScope.jwt
                }
            };

            if (data && method === 'post') {
                req.headers['Content-Type'] = 'application/json';
                req.data = data;
            }

            return req;
        }

        return api;
    }

})();
