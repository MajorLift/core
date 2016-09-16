const async = require('async')
const inherits = require('util').inherits

module.exports = RpcEngine

inherits(RpcEngine, Array)

function RpcEngine(){
  
}

RpcEngine.prototype.handle = function(req, cb) {
  const self = this

  if (Array.isArray(req)) {
    async.map(req, self._handle.bind(self), cb)
  } else {
    self._handle(req, cb)
  }
}

RpcEngine.prototype._handle = function(req, cb) {
  const self = this
  
  // create response obj
  const res = {
    id: req.id,
    jsonrpc: req.jsonrpc,
  }
  // pointer for the stack
  let middlewareIndex = 0
  // for climbing back up the stack
  let returnHandlers = []
  // flag for stack return
  let isComplete = false
  // the way down
  async.until(() => isComplete, runMiddleware, runReturnHandlers)

  // runs the next middleware
  function runMiddleware(next){
    let currentMiddleware = self[middlewareIndex]
    if (!currentMiddleware) return next(new Error('RpcEngine - nothing ended request'))
    currentMiddleware(req, res, nextMiddleware, end)
    function nextMiddleware(cb){
      // setup return handler
      returnHandlers.push(cb)
      middlewareIndex++
      next()
    }
    function end(err){
      if (err) return next(err)
      isComplete = true
      next()
    }
  }

  // climbs the stack calling return handlers
  function runReturnHandlers(err){
    if (err) return cb(err)
    async.eachSeries(returnHandlers.filter(Boolean), function(handler, next){
      handler(next)
    }, competeRequest)
  }

  // returns the result
  function competeRequest(){
    cb(null, res)
  }

}
