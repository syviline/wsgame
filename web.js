const express = require('express')
const path = require('path')

const app = express()

app.use(express.static(path.resolve(__dirname, 'static')))

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'templates', 'index.html'))
})

module.exports.startWebServer = function () {
    app.listen(80, () => {
    console.log('Web-server running.')
})
}