const WebSocket = require('ws');

const server = new WebSocket.Server({host: '0.0.0.0', port: 9000})
let clients = {}
let globalIndex = 0

const randomCoordMin = 20
const randomCoordMax = 200

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function hypotenuse(x, y) {
    return Math.sqrt(x * x + y * y)
}

class Client {
    constructor(ws, x=undefined, y=undefined) {
        this.ws = ws
        if (!x) {
            this.x = random(randomCoordMin, randomCoordMax)
            this.y = random(randomCoordMin, randomCoordMax)
        } else {
            this.x = x
            this.y = y
        }
        this.moveX = 0
        this.moveY = 0
        this.speedX = 0
        this.speedY = 0
        this.boost = 0.2
        this.maxSpeed = 5
    }

    getInfo() {
        return {'x': this.x, 'y': this.y, 'index': this.ws.index}
    }
}

function getClientList() {
    let result = {}
    Object.keys(clients).forEach(key => {
        let el = clients[key]
        result[el.ws.index] = el.getInfo()
    })
    return result
}

function cjson(message) {
    return JSON.stringify(message)
}

function onMessage(client, message) {
    let data = JSON.parse(message)
    switch (data.type) {
        case 'startMove':
            if (data.direction === 'top')
                client.class.moveY = -1
            else if (data.direction === 'bottom')
                client.class.moveY = 1
            else if (data.direction === 'left')
                client.class.moveX = -1
            else if (data.direction === 'right') {
                client.class.moveX = 1
                console.log(client.class.moveX)
            }
            break;
        case 'stopMove':
            if (data.direction === 'top' || data.direction === 'bottom')
                client.class.moveY = 0
            else if (data.direction === 'left' || data.direction === 'right')
                client.class.moveX = 0
            break;
    }
}

function broadcast(message) {
    Object.keys(clients).forEach(key => {
        let client = clients[key].ws
        client.send(message)
    })
}

function onClose(client) {
    delete clients[client.index]
    broadcast(cjson({'type': 'close', 'index': client.index}))
}

function onConnect(client) {
    console.log('user connected')
    clients[globalIndex] = new Client(client)
    client.index = globalIndex
    client.class = clients[globalIndex]
    client.send(cjson({'type': 'postconnect', 'clients': getClientList(), 'selfIndex': client.index}))
    broadcast(cjson({'type': 'newUser', 'info': clients[globalIndex].getInfo()}))
    ++globalIndex
    client.on('message', message => onMessage(client, message))
    client.on('close', () => onClose(client))
}

server.on('connection', onConnect);

console.log('Server started')

let lastTime = Date.now()

function updater() {
    let thisTime = Date.now()
    let timeDiff = thisTime - lastTime
    lastTime = thisTime
    Object.keys(clients).forEach(key => {
        let client = clients[key]
        client.speedX += client.boost * client.moveX * timeDiff
        client.speedY += client.boost * client.moveY * timeDiff
        if (Math.abs(client.speedY) > client.maxSpeed) {
            if (client.speedY < 0)
                client.speedY = -client.maxSpeed
            else
                client.speedY = client.maxSpeed
        }
        if (Math.abs(client.speedX) > client.maxSpeed) {
            if (client.speedX < 0)
                client.speedX = -client.maxSpeed
            else
                client.speedX = client.maxSpeed
        }
        // console.log(client.moveX)
        if (client.speedX != 0 && client.speedY != 0) {
            let hypot = hypotenuse(client.speedX, client.speedY)
            let normalizedX = client.speedX * client.speedX / hypot * client.moveX
            let normalizedY = client.speedY * client.speedY / hypot * client.moveY
            client.x += normalizedX
            client.y += normalizedY
        }
    })
    broadcast(cjson({'type': 'update', 'info': getClientList()}))
}

setInterval(updater, 40)