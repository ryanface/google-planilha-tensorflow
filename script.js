var cursor = db.getCollection('caso').find({});
while (cursor.hasNext()) {
    var doc = cursor.next();
    var parts = doc.dataRegistro.split(" ")[0].split("/");
    var dt = new Date(
            parseInt(parts[2], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[0], 10)
        );
    db.getCollection('caso').update(
        {"_id" : doc._id},
        {"$set" : {"created_at":dt}}
    )
};

var cursor = db.getCollection('caso').aggregate(
  {$group: {_id: {created_at:'$created_at'}, casos: {$sum: 1}}},
  {$sort: {_id: -1}}
);
while (cursor.hasNext()) {
    var doc = cursor.next();
    doc.data= doc._id.created_at;
    delete doc._id;
    print(doc)
    db.getCollection('warning').save(doc);
}
