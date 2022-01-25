class Canvas {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.canvas.width = document.body.clientWidth
        this.canvas.height = document.body.clientHeight

        this.cameraX = 0
        this.cameraY = 0

        this.middleX = this.canvas.width / 2
        this.middleY = this.canvas.height / 2

        this.gridWidth = 1
        this.gridGap = 20
    }

    updateCanvas() {
        this.ctx.fillStyle = '#FFF'
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        this.drawGrid()
        this.cameraX = selfInfo.x
        this.cameraY = selfInfo.y
        Object.keys(clients).forEach(key => {
            let el = clients[key]
            // el.update()
            el.draw(this.ctx)
        })
    }

    drawGrid() {
        this.ctx.fillStyle = '#EEE'
        for (let i = 0; i * this.gridGap < this.canvas.width; ++i) {
            this.ctx.fillRect(i * this.gridGap - this.cameraX % this.gridGap, 0, this.gridWidth, this.canvas.height)
        }
        for (let i = 0; i * this.gridGap < this.canvas.height; ++i) {
            this.ctx.fillRect(0, i * this.gridGap - this.cameraY % this.gridGap, this.canvas.width, this.gridWidth)
        }
    }
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function hypotenuse(x, y) {
    return Math.sqrt(x * x + y * y)
}

let canvas = new Canvas(document.querySelector('canvas'))

const HOST = 'syviline.ddns.net'
const PORT = '9000'

const PI = Math.PI
const TAU = 2 * Math.PI

let clients = {}
let selfInfo = {}

let objectx = 100
let objecty = 100

let trailLength = 28

class Entity {
    constructor(data) {
        this.updateData(data)
    }

    updateData(data) {
        this.x = data.x
        this.y = data.y
        this.moveX = data.moveX
        this.moveY = data.moveY
        this.speedX = data.speedX
        this.speedY = data.speedY
        this.boost = data.boost
        this.maxSpeed = data.maxSpeed
        this.slowdownSpeed = data.slowdownSpeed
        this.index = data.index
    }
    
    moveTo(x, y) {
        let angle = Math.atan2(y - this.y, x - this.x)
        let cos = Math.cos(angle)
        let sin = Math.sin(angle)
        this.speedX = this.maxSpeed * cos
        this.speedY = this.maxSpeed * sin
    }

    update(timeDiff) {
        let angle = Math.atan2(this.speedY, this.speedX)

        if (this.speedX > 0)
            this.speedX = Math.max(this.speedX - this.slowdownSpeed * timeDiff * Math.abs(Math.cos(angle)), 0)
        else if (this.speedX < 0)
            this.speedX = Math.min(this.speedX + this.slowdownSpeed * timeDiff * Math.abs(Math.cos(angle)), 0)

        if (this.speedY > 0)
            this.speedY = Math.max(this.speedY - this.slowdownSpeed * timeDiff * Math.abs(Math.sin(angle)), 0)
        else if (this.speedY < 0)
            this.speedY = Math.min(this.speedY + this.slowdownSpeed * timeDiff * Math.abs(Math.sin(angle)), 0)

        this.speedX += this.boost * this.moveX * timeDiff
        this.speedY += this.boost * this.moveY * timeDiff
        if (Math.abs(this.speedY) > this.maxSpeed) {
            if (this.speedY < 0)
                this.speedY = -this.maxSpeed
            else
                this.speedY = this.maxSpeed
        }
        if (Math.abs(this.speedX) > this.maxSpeed) {
            if (this.speedX < 0)
                this.speedX = -this.maxSpeed
            else
                this.speedX = this.maxSpeed
        }
        // console.log(client.moveX)
        if (this.speedX != 0 || this.speedY != 0) {
            let hypot = hypotenuse(this.speedX, this.speedY)
            let normalizedX = this.speedX * Math.abs(this.speedX) / hypot * timeDiff
            let normalizedY = this.speedY * Math.abs(this.speedY) / hypot * timeDiff
            console.log(normalizedX, this.speedX)
            this.x += normalizedX
            this.y += normalizedY
        }
    }
    draw(ctx) {}
}

class Tank extends Entity {
    draw(ctx) {
        ctx.beginPath()
        ctx.fillStyle = '#000000'
        // console.log(this.x - canvas.)
        ctx.arc(this.x - canvas.cameraX + canvas.middleX, this.y - canvas.cameraY + canvas.middleY, 20, 0, TAU)
        ctx.fill()
    }
}

function cjson(message) {
    return JSON.stringify(message)
}

let lastTime = Date.now()

function predict() {
    let thisTime = Date.now()
    let timeDiff = (thisTime - lastTime) / 1000
    lastTime = thisTime
    Object.keys(clients).forEach(key => {
        let client = clients[key]
        client.update(timeDiff)
    })
}


function updateCanvas() {
    canvas.updateCanvas()
    predict()
    requestAnimationFrame(updateCanvas)
}

requestAnimationFrame(updateCanvas)


const ws = new WebSocket(`ws://${HOST}:${PORT}`);
// обработчик проинформирует в консоль когда соединение установится
ws.onopen = function () {
    console.log('подключился');
};
// обработчик сообщений от сервера
ws.onmessage = function (message) {
    let data = JSON.parse(message.data)
    switch (data.type) {
        case 'postconnect':
            console.log(data.clients)
            Object.keys(data.clients).forEach(key => {
                clients[data.clients[key].index] = (new Tank(data.clients[key]))
            })
            selfInfo = clients[data.selfIndex]
            break;
        case 'newUser':
            if (data.info.index === selfInfo.index) break;
            clients[data.info.index] = new Tank(data.info)
            break;
        case 'update':
            Object.keys(data.info).forEach(key => {
                let client = data.info[key]
                clients[key].updateData(client)
            })
            break;
        case 'close':
            delete clients[data.index]
            break;
    }
};

// функция для отправки echo-сообщений на сервер
function wsSendEcho(value) {
    ws.send(JSON.stringify({action: 'ECHO', data: value.toString()}));
}

// функция для отправки команды ping на сервер
function wsSendPing() {
    ws.send(JSON.stringify({action: 'PING'}));
}

document.addEventListener('keydown', ev => {
    switch (ev.key) {
        case 'w':
            ws.send(cjson({'type': 'startMove', 'direction': 'top'}))
            break;
        case 'a':
            ws.send(cjson({'type': 'startMove', 'direction': 'left'}))
            break;
        case 's':
            ws.send(cjson({'type': 'startMove', 'direction': 'bottom'}))
            break;
        case 'd':
            ws.send(cjson({'type': 'startMove', 'direction': 'right'}))
            break;
    }
})

document.addEventListener('keyup', ev => {
    switch (ev.key) {
        case 'w':
            ws.send(cjson({'type': 'stopMove', 'direction': 'top'}))
            break;
        case 'a':
            ws.send(cjson({'type': 'stopMove', 'direction': 'left'}))
            break;
        case 's':
            ws.send(cjson({'type': 'stopMove', 'direction': 'bottom'}))
            break;
        case 'd':
            ws.send(cjson({'type': 'stopMove', 'direction': 'right'}))
            break;
    }
})