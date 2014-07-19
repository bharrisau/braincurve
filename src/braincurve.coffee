class Braincurve
  constructor: () ->
    blob = new Blob [document.querySelector('#worker').textContent], {
      type: "text/javascript"
    }

    @worker = new Worker window.URL.createObjectURL blob
    @worker.onmessage = (e) ->
      console.log "Received: " + e.data

  callCatena: (pwd, salt, data, garlic) ->
    options =
      pwd: pwd
      salt: salt
      data: data
      lambda: 4
      len: 32
      garlic: garlic

    @worker.postMessage options

bc = new Braincurve()
