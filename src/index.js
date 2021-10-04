const path = require('path')
const http =  require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const port = process.env.PORT || 3000
const server = http.createServer(app)
const io = socketio(server)

const publicDiretoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDiretoryPath))


io.on('connection', (socket)=>{
    console.log('New Websocket connection')


    socket.on('join', (options, callback)=>{
        const {error, user} = addUser({id: socket.id, ...options})

        if(error){
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('Message',generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('Message',generateMessage(`${user.username} has joined !`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback)=>{
        const user = getUser(socket.id)
        const filter= new Filter()

        if(filter.isProfane(message)){
            return callback('Watch your tongue !')
        }
        io.to(user.room).emit('Message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords,callback)=>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage',generateLocationMessage(user.username,`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })
    socket.on('disconnect',()=>{
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('Message',generateMessage(`${user.username} has left !`))
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }


    })

})


server.listen(port, ()=>{
    console.log('Server is up and running on port '+ port)
})