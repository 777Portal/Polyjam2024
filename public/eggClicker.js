document.addEventListener('loggedIn', (event) => {
    console.log('Event received:', event.detail.message);

    socket.on("connect", () => {
        canSendEggs = true
        socket.emit("conn", {message: `Clicker connected @ [ ${getTimeStamp()} ]`})
    });
    
    socket.on("CloseConn", (data) => {
        console.log(data)
        canSendEggs = false
        toggleVis('overlay')
        document.getElementById('reason').innerText = data.reason
    });
    
    document.getElementById('myEgg').addEventListener('click', function(e){
        socket.emit('CLK', {e})
    })
    
    let eps = document.getElementById('eps')
    let currentEgg = document.getElementById('currentEggAmount')
    
    socket.on("EU", (data) => {
        eggAmount = addCommaToNumber(data.currentEggs);
        if (focused == false) document.title = `EC - (${eggAmount})`;
    
        console.log(data)
        epsAmount = data.EPS
    
        eps.innerText = `${epsAmount} / ${data.MEPS} eggs per second`
        
        currentEgg.innerText = `${eggAmount} eggs`
    
        // if eggs per second is zero then don't shake
        if(epsAmount <= 0) return doStyleChange('remove', 'shaker');
        
        // else if eps is at max:
        if ( epsAmount == data.MEPS ) return doStyleChange('add', 'superShaker');
    
        doStyleChange('add', 'shaker'); // start animation
        doStyleChange('remove', 'superShaker');
    });
    
    function doStyleChange(type, name){
        let myEgg = document.getElementById('myEgg')
    
        // if no array just do the one style
        if ( !Array.isArray(name) ) 
        {
            void myEgg.offsetWidth; // trigger reflow
            return myEgg.classList[type](name)
        }
        
        // if yes style do multiple
        for (classname in name){
            myEgg.classList[type](classname)
            void myEgg.offsetWidth; // trigger reflow    
        }
    }
});  