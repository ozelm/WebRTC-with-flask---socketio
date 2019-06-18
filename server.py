import os, json

from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_socketio import SocketIO, send, emit

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
socketio = SocketIO(app)

users_to_sid = {}
sid_to_users = {}
connections = {}

@socketio.on('connect')
def on_connect():
    print(f'User {request.sid} connected')
    response = {'message':'Connected to server.'}
    send(response, rooms=request.sid)

@socketio.on('message')
def on_message(message):
    try:
        data = json.loads(message)
    except TypeError:
        print('Invalid json')
        data = {}

    if data['type'] == 'login':

        if data['name'] in users_to_sid.keys():
            response = {'type':'login', 'success':'false'}
            send(response, room=request.sid)
        else:
            users_to_sid[data['name']] = request.sid
            sid_to_users[request.sid] = data['name']
            response = {'type':'login', 'success':'true'}
            send(response, room=request.sid)
            print(f'User {request.sid} logged in as: ', data['name'])

    elif data['type'] == 'offer':
        print('Sending offer to: ', data['name'])

        if request.sid in sid_to_users.keys():

            if data['name'] in users_to_sid.keys():

                connections[sid_to_users[request.sid]] = data['name']
                response = {'type':'offer', 'offer':data['offer'], 'name':sid_to_users[request.sid]}
                send(response, room=users_to_sid[data['name']])
                # response = jsonify(type='offer', success='true')
                # send(response, room=request.sid)

        #     else:
        #         response = jsonify(type='offer', success='false')
        #         send(response, room=request.sid)

        # else:
        #     response = jsonify(type='offer', success='false')
        #     send(response, room=request.sid)

    elif data['type'] == 'answer':
        print('Sending answer to: ', data['name'])

        if request.sid in sid_to_users.keys():

            if data['name'] in users_to_sid.keys():

                connections[sid_to_users[request.sid]] = data['name']
                response = {'type':'answer', 'answer':data['answer']}
                send(response, room=users_to_sid[data['name']])
        #         response = jsonify(type='answer', success='true')
        #         send(response, room=request.sid)

        #     else:
        #         response = jsonify(type='answer', success='false')
        #         send(response, room=request.sid)

        # else:
        #     response = jsonify(type='answer', success='false')
        #     send(response, room=request.sid)

    elif data['type'] == 'candidate':
        print('Sending candidate to: ', data['name'])

        if request.sid in sid_to_users.keys():

            if data['name'] in users_to_sid.keys():

                response = {'type':'candidate', 'candidate':data['candidate']}
                send(response, room=users_to_sid[data['name']])
        #         response = jsonify(type='candidate', success='true')
        #         send(response, room=request.sid)

        #     else:
        #         response = jsonify(type='candidate', success='false')
        #         send(response, room=request.sid)

        # else:
        #     response = jsonify(type='candidate', success='false')
        #     send(response, room=request.sid)

    elif data['type'] == 'leave':
        print('Disconnecting from: ', data['name'])

        if data['name'] in users_to_sid.keys() and request.sid in sid_to_users.keys():

            conn = sid_to_users[request.sid]

            for i, j in connections.items():
                if i == conn or j == conn:
                    del connections[i]
                    break

            response = {'type':'leave', 'success':'true'}
            send(response, room=request.sid)

        # else:
        #     response = jsonify(type='leave', success='false')
        #     send(response, room=request.sid)

    else:
        response = {'type':'error', 'message':f'command not found {data["type"]}'}

@socketio.on('leave')
def on_leave():

    if request.sid:
        name = sid_to_users[request.sid]
        del users_to_sid[name]
        del sid_to_users[request.sid]

        for i, j in connections.items():
                if i == name or j == name:
                    del connections[i]
                    break

@app.route("/", methods=['GET', 'POST'])
def index():
    return render_template("index.html")

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    socketio.run(app, debug=True, host="0.0.0.0", ssl_context='adhoc')
    # socketio.run(app, debug=True)
