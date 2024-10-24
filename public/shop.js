var balance = 0;
var balanceTopbar = document.getElementById('balTopBar')

// get how much moneyz we have from wss
socket.on("EU", (data) => {
  balance = data.currentEggs
  balanceTopbar.innerText = `${addCommaToNumber(balance)} eggs`
});

// Bu
socket.on("BU", (data) => {
  let result = data.result
  
  // if result is true, do green, if not do red, ect, ect. (not a nullish operator but i love nullish operators)
  let color = result ? 'green' : 'red'
  let string = result ? 'Sucessfully purchased item!' : data.error
  let price = data?.newPrice
  let level = data?.level;
  let maxLevel = data?.maxLevel;

  let item = data.item

  console.log(string)

  let theButton = document.getElementById(item)
  let levelText = theButton.parentElement.getElementsById(`${item}Level`)
  levelText.innerText = `level ${item} / ${maxLevel}`

  // if it was sucessful we should've gotten new price, so we set it. (rounded to the 0.00 place thing)
  if (result) theButton.innerText = `buy for ${roundNumber(price)} eggs`;
  theButton.style.backgroundColor = color

  setTimeout(() => {
    let theButton = document.getElementById(item)
    theButton.style.backgroundColor = 'white';
    theButton.disabled = false;
  }, .5 * 1000);
});


document.onload = innit()

// programtically add all shop items form rest endpoint
async function innit(){
  const response = await fetch("https://www.polyjam.win/shopItems");
  var allShopCatagorys = await response.json();

  // this is gonna be so ugly but fuck it we ball
  // its per catagory, so we take a catagory and then pass it to a seperate func to be added

  console.log(allShopCatagorys)
  for (let catagory in allShopCatagorys)
  {
    console.log(catagory)

    // catagory's id is the id of the holder.
    let holder = document.getElementById(catagory)
    if ( !holder )
    {
      console.error('couldn\'t find the catagory: ', catagory, ' @', getTimeStamp())
      continue
    }

    // we take that data and ship it to a function to add it to this specific catagory. (is my js pretty yet?)
    addCatagoryShopItems( holder, allShopCatagorys[catagory], catagory )
  }
}

async function addCatagoryShopItems(holder, json, catagory){
  // for loop for all the actual items of the catagory.
  const response = await fetch("https://www.polyjam.win/me");
  var userData = await response.json();

  for (let shopItem in json)
  {
    let itemJson = json[shopItem]

    // if it exists use that level, if not, then use base level.
    x = userData?.shop?.[shopItem] ?? itemJson.baseLevel
    let theActualPrice = eval(itemJson.pricingEquation) // (hopefully) fine, bc its not on the server (rah)
    theActualPrice = Math.round(theActualPrice * 100) / 100 // round to the .00 place

    // main thing that is the "item"
    let newChild = createEl('div')
      newChild.classList = 'item'
      newChild.style.textAlign = 'center'
      newChild.id = catagory

    // the display name
    let name = createEl('h2')
      name.innerText = itemJson.displayName
    
    // for the describtive text.
    let description = createEl('small')
      description.innerText = itemJson.discription

    let level = createEl('p')
      level.innerText = `level ${roundNumber(x)}/${itemJson.maxLevel}`
      level.id = `${itemJson.actualName}Level`

    let additionInfo = createEl('p')
      // if x user level exists then use that if not then just use 1.
      additionInfo.innerText = `adds +${itemJson.adds} per each purchase.`

    let btn = createEl('button') // for the actual shop buying stuff
      btn.id = itemJson.actualName
      btn.innerText = `buy for ${theActualPrice} eggs`
      if (x >= itemJson.maxLevel) {
        btn.innerText = "max level achived!"
        btn.disabled = true
      }
    
    // listner
    btn.addEventListener('click', function(){
      let id = this.id
      let catagory = this.parentElement.id
      console.log(id)  
      socket.emit('B', {item : id, catagory})
      this.disabled = true;
      // this.innerText = 'waiting for server to respond...'
    })    

    newChild.appendChild(name)
    newChild.appendChild(createEl('br'))
    newChild.appendChild(description)
    newChild.appendChild(additionInfo)
    newChild.appendChild(createEl('br'))
    newChild.appendChild(level)
    newChild.appendChild(btn)
    
    holder.appendChild(newChild)
  }
  // annoying to type it out
  function createEl(element){
    return document.createElement(element)
  }
}