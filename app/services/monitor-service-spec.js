describe('MonitorService', function () {

    beforeEach(module('katGui'));

    var authMessage = {
        type: "message",
        data: '{"jsonrpc": "2.0",' +
        '"result": {' +
        '"email": "fjoubert@ska.ac.za",' +
        '"session_id": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE0MjYxNDk5OTcsIm5hbWUiOiJGcmFuY29pcyBKb3ViZXJ0IiwiaWQiOjEsInJvbGVzIjpbImNvbnRyb2xfYXV0aG9yaXR5IiwidXNlcl9hZG1pbiIsImxlYWRfb3BlcmF0b3IiLCJvcGVyYXRvciIsInJlYWRfb25seSJdLCJlbWFpbCI6ImZqb3ViZXJ0QHNrYS5hYy56YSJ9.F0f9i3b-ns8p4igqdhGiRCRI6N5S3B2dRSzgCt0Czqo"' +
        '},' +
        '"id": "authorise190d6c08-af9b-4432-a5d1-15ab9be24bdc"' +
        '}'
    };

    var badAuthMessage = {
        type: "message",
        data: '{"jsonrpc": "2.0",' +
        '"result": "error",' +
        '"id": "authorise190d6c08-af9b-4432-a5d1-15ab9be24bdc"' +
        '}'
    };

    var errorMessage = {
        type: "message",
        data: '{"error": {"message":"test error"}}'
    };

    var goodMessageKataware = {
        type: "message",
        data: '{"result": {"msg_channel":"", "msg_data":""}, "id":"redis-pubsub"}'
    };

    var badMessage = {
        type: "message",
        data: '{"id":"redis-pubsub"}'
    };

    var goodMessageKataware2 = {
        type: "message",
        data: '{"id":"redis-pubsub-init", "result": [{"msg_channel":"kataware:test", "msg_data":{"value":"test_value"}}]}'
    };

    var goodMessageMode = {
        type: "message",
        data: '{"id":"redis-pubsub-init", "result": [{"msg_channel":"test:mode", "msg_data":{"value":"test_value"}}]}'
    };

    var goodMessageStatus = {
        type: "message",
        data: '{"id":"redis-pubsub-init", "result": [{"msg_channel":"test:test", "msg_data":{"value":"test_value"}}]}'
    };

    var goodMessageSched = {
        type: "message",
        data: '{"id":"redis-pubsub-init", "result": [{"msg_channel":"sched:test", "msg_data":{"value":"test_value"}}]}'
    };

    var badIDMessage = {
        type: "message",
        data: '{"id":"redis-pubsub-init", "result": [{"msg_channel":"", "msg_data":""}]}'
    };

    var garbageMessage = {
        type: "message",
        data: '{"id":"redis-pubsub-init", "result": [{"msg_channel":"1"}]}'
    };

    var httpBackend, MonitorService, AlarmsService, ConfigService, ObservationScheduleService, StatusService,  scope, timeout;

    beforeEach(inject(function ($rootScope, _$injector_, _MonitorService_, _ConfigService_, _$timeout_, _AlarmsService_, _ObservationScheduleService_, _StatusService_, $templateCache) {
        timeout = _$timeout_;
        httpBackend = _$injector_.get('$httpBackend');
        MonitorService = _MonitorService_;
        ConfigService = _ConfigService_;
        AlarmsService = _AlarmsService_;
        ObservationScheduleService = _ObservationScheduleService_;
        StatusService = _StatusService_;
        scope = $rootScope.$new();
        $rootScope.showSimpleDialog = function () {
        };
        $rootScope.showSimpleToast = function () {
        };
        AlarmsService.receivedAlarmMessage = function () {
        };

        window.SockJS = (function () {
            function SockJS() {
            }

            SockJS.prototype.send = function () {

            };
            SockJS.prototype.close = function () {

            };
            return SockJS;
        })();

        $templateCache.put('app/login-form/login-form.html', '');
    }));

    it('should subscribe to all receptor updates', inject(function () {
        ConfigService.receptorList = ['test1', 'test2', 'test3'];
        var subscribeSpy = spyOn(MonitorService, 'subscribe');
        MonitorService.subscribeToReceptorUpdates();
        expect(subscribeSpy.calls.argsFor(0)).toEqual([['test1:mode', 'test1:inhibited']]);
        expect(subscribeSpy.calls.argsFor(1)).toEqual([['test2:mode', 'test2:inhibited']]);
        expect(subscribeSpy.calls.argsFor(2)).toEqual([['test3:mode', 'test3:inhibited']]);
    }));

    it('should subscribe to alarms', inject(function () {
        var subscribeSpy = spyOn(MonitorService, 'subscribe');
        MonitorService.subscribeToAlarms();
        expect(subscribeSpy.calls.mostRecent().args[0]).toEqual('kataware:alarm_*');
    }));

    it('should create a SockJS class and set the functions when connecting the listener', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
    });

    it('should disconnect the connection', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        var closeSpy = spyOn(MonitorService.connection, 'close');
        MonitorService.disconnectListener();
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should not disconnect the connection when there is no connection', function () {
        spyOn(console, 'error');
        MonitorService.disconnectListener();
        expect(console.error).toHaveBeenCalledWith('Attempting to disconnect an already disconnected connection!');
    });

    it('should authenticate the socket connection on socket open when connection is in readyState', function () {
        var authSpy = spyOn(MonitorService, 'authenticateSocketConnection');
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.connection.readyState = true;
        MonitorService.onSockJSOpen();
        expect(authSpy).toHaveBeenCalled();
    });

    it('should NOT authenticate the socket connection on socket open when connection is not in readyState', function () {
        var authSpy = spyOn(MonitorService, 'authenticateSocketConnection');
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSOpen();
        expect(authSpy).not.toHaveBeenCalled();
    });

    it('should set the connection to null on disconnect', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        var closeSpy = spyOn(MonitorService.connection, 'close');
        MonitorService.disconnectListener();
        expect(closeSpy).toHaveBeenCalled();
        MonitorService.onSockJSClose();
        expect(MonitorService.connection).toBeNull();
    });

    it('should send the authentication message', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        var sendSpy = spyOn(MonitorService.connection, 'send');
        scope.$root.session_id = "test_session_id";
        MonitorService.authenticateSocketConnection();
        expect(MonitorService.connection.authorized).toBeFalsy();
        scope.$root.session_id = "test_session_id";
        expect(sendSpy.calls.mostRecent().args[0]).toMatch(/\{"jsonrpc":"2.0","method":"authorise","params":\["test_session_id"\],"id":"authorise.*\}/);
    });

    it('should NOT send the authentication message when there is no connection', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        var sendSpy = spyOn(MonitorService.connection, 'send');
        var closeSpy = spyOn(MonitorService.connection, 'close');
        MonitorService.disconnectListener();
        MonitorService.onSockJSClose();
        expect(MonitorService.connection).toBeNull();
        MonitorService.authenticateSocketConnection();
        expect(closeSpy).toHaveBeenCalled();
        expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should send the subscribe command', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        var sendSpy = spyOn(MonitorService.connection, 'send');
        MonitorService.connection.readyState = true;
        MonitorService.connection.authorized = true;
        MonitorService.subscribe('test_subsribe');
        expect(sendSpy.calls.mostRecent().args[0]).toMatch(/\{"jsonrpc":"2.0","method":"subscribe","params":\["test_subsribe"\],"id":"monitor.*"\}/);
    });

    it('should not send the subscribe command, but should create a timeout for a retry when the connection is not in readyState', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        var sendSpy = spyOn(MonitorService.connection, 'send');
        MonitorService.connection.authorized = false;
        MonitorService.subscribe('test_subscribe');
        expect(sendSpy).not.toHaveBeenCalled();
        var sendControlCommandSpy = spyOn(MonitorService, 'subscribe');
        timeout.flush(500);
        expect(sendControlCommandSpy).toHaveBeenCalledWith('test_subscribe');
    });

    it('should set the connection as authorized when a session_id is received', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage(authMessage);
        expect(MonitorService.connection.authorized).toBeTruthy();
    });

    it('should set the connection as authorized when a session_id is received', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage(authMessage);
        expect(MonitorService.connection.authorized).toBeTruthy();
    });

    it('should NOT set the connection as authorized when a session_id is NOT received', function () {
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage(badAuthMessage);
        expect(MonitorService.connection.authorized).toBeFalsy();
    });

    it('should log an error when receiving an error message', function () {
        var errorSpy = spyOn(console, 'error');
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage(errorMessage);
        expect(errorSpy).toHaveBeenCalledWith('There was an error sending a jsonrpc request:');
    });

    it('should log an error message when receiving an unknown message type', function () {
        var errorSpy = spyOn(console, 'error');
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage({data: '{"a": ""}'});
        expect(errorSpy).toHaveBeenCalledWith('Dangling monitor message...');
    });

    it('should add the message in an array if it was not received in an array', function () {
        var errorSpy = spyOn(console, 'error');
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage(goodMessageKataware);
        expect(errorSpy).toHaveBeenCalledWith('Dangling monitor message...');
    });

    it('should do nothing when there is no data in the message', function () {
        var errorSpy = spyOn(console, 'error');
        MonitorService.onSockJSMessage(badMessage);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should not push the data into an array when the id is redis-pubsub-init', function () {
        var errorSpy = spyOn(console, 'error');
        var result = MonitorService.connectListener();
        expect(MonitorService.connection).toBeDefined();
        expect(result).toBeTruthy();
        MonitorService.onSockJSMessage(badIDMessage);
        expect(errorSpy).toHaveBeenCalledWith('Dangling monitor message...');
    });

    it('should call the AlarmService function when receiving the appropriate alarm message', function () {
        var receivedAlarmMessageSpy = spyOn(AlarmsService, 'receivedAlarmMessage');
        MonitorService.onSockJSMessage(goodMessageKataware2);
        expect(receivedAlarmMessageSpy).toHaveBeenCalledWith('kataware:test', { value: 'test_value' });
    });

    it('should emit a message on the rootScope when an operatorControlStatusMessage type is received', function () {
        var emitSpy = spyOn(scope.$root, '$emit');
        MonitorService.onSockJSMessage(goodMessageMode);
        expect(emitSpy).toHaveBeenCalledWith('operatorControlStatusMessage', { name: 'test:mode', value: Object({ value: 'test_value' }) });
    });

    it('should call the ObservationScheduleService function when receiving the appropriate sched message', function () {
        var receivedSchedMessageSpy = spyOn(ObservationScheduleService, 'receivedSchedMessage');
        MonitorService.onSockJSMessage(goodMessageSched);
        expect(receivedSchedMessageSpy).toHaveBeenCalledWith('sched:test', { value: 'test_value' });
    });

    it('should call the StatusService function when receiving the appropriate status message', function () {
        var messageReceivedSensorsSpy = spyOn(StatusService, 'messageReceivedSensors');
        MonitorService.onSockJSMessage(goodMessageStatus);
        expect(messageReceivedSensorsSpy).toHaveBeenCalledWith('test:test', { value: 'test_value' });
    });

    it('should do nothing with a garbage message', function () {
        var messageReceivedSensorsSpy = spyOn(StatusService, 'messageReceivedSensors');
        var receivedSchedMessageSpy = spyOn(ObservationScheduleService, 'receivedSchedMessage');
        var emitSpy = spyOn(scope.$root, '$emit');
        var errorSpy = spyOn(console, 'error');
        MonitorService.onSockJSMessage(garbageMessage);
        expect(messageReceivedSensorsSpy).not.toHaveBeenCalled();
        expect(receivedSchedMessageSpy).not.toHaveBeenCalled();
        expect(emitSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should not parse an invalid message (the JSON string has no data attribute)', function() {
        var errorSpy = spyOn(console, 'error');
        MonitorService.onSockJSMessage();
        expect(errorSpy).toHaveBeenCalledWith('Dangling monitor message...');
    });
});