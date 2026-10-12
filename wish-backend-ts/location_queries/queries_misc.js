db.getCollection("locations").find({"name_norm": "Lisb"})


let term = "joa da madeira";
db.getCollection("locations_pt").find({ $or: [ 
    { name_norm: new RegExp('^' + term)  },
    { normalized_list: new RegExp('^' + term)  } ,
    { normalized_list: new RegExp('^' + 'joa')  },
    { normalized_list: new RegExp('^' + 'mad')  },
]})

db.locations_pt.find({$text:{$search: "joa da madeira"}}).sort({score: { $meta: "textScore" }})



db.getCollection("locations").find({ "tags.name": {  $eq: null } })
db.getCollection("locations").find({"type": "relation", "tags.name": "Castelo Branco" })

db.locations.find({id: 25277563})


db.getCollection("locations_pt").createIndex( { normalized_list: 1  } );
db.getCollection("locations_pt").createIndex( { name_norm: 1  } );
db.locations_pt.createIndex({name_norm:"text", normalized_list:"text"},  {weights:{name_norm:5, normalized_list:10},  name:"TextIndex"})
