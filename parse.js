/**
 * Parse XML
 * @param {Buffer} buffer 
 * @returns {[]} objects
 */
function parseXML(buffer)
{
    var str = buffer.toString();
    var tags = [];
    var isTag = false;
    var objects = [];
    var currentObject;
    for(let char of str)
    {

        switch(char)
        {
            case '<':
                tags.push("");
                isTag = true;
                break;
            case '>':
                isTag = false;

                if(tags[tags.length - 1].startsWith("?xml"))
                {
                    tags.pop();
                }
                else if(tags[tags.length - 1].startsWith('/'))
                {
                    if(tags.length > 1 && tags[tags.length - 2].split(" ")[0] == tags[tags.length - 1].substring(1))
                    {
                        tags.pop();
                        tags.pop();
                    }
                    else
                    {
                        console.error("err: opening tag not found");
                    }                  
                }
                else
                {
                    let currentTag = tags[tags.length - 1];
                    let arr = currentTag.split(" ").map(o=>o.trim());
                    let name = arr[0];
                    let attributes = {};
                    for(let i=1; i<arr.length; i++)
                    {
                        let parts = arr[i].split("=");
                        attributes[parts[0]] = parts[1].substring(1,parts[1].length -1);
                    }
                    let obj = {name,attributes,children:[],content:""};
                    objects.push(obj);
                    if(currentObject)
                    {
                        currentObject.children.push(obj);
                    }
                    currentObject = obj;        
                }
                break;
            default:
                if(isTag)
                {
                    tags[tags.length - 1] += char;
                }
                else if(objects.length > 0)
                {
                    objects[objects.length - 1].content += char;
                }
                      
        }
        
    }

    return objects;
}


/**
 * 
 * @param {String} string 
 * @returns {Object}
 */
 function parseKeyValuePairs(string)
 {
    var result = {};
    for(let item of string.split(","))
    {
       let parts = item.split(/\=(.*)/,2);
       if(parts.length == 2)
       {
           result[parts[0]] = parts[1];
       }
    }
    return result;
 }

module.exports = {parseXML, parseKeyValuePairs};