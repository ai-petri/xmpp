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
                        currentObject = currentObject.parent;
                    }                
                }
                else
                {
                    let currentTag = tags[tags.length - 1];
                    let name = "";
                    let attributes = {};
                    let n = 0;
                    let inQuotes = false;
                    let attributeName = "";
                    let attributeValue = "";
                    let prevChar = "";
                    for(let char of currentTag)
                    {
                        switch(char)
                        {
                            case '"':
                                inQuotes = !inQuotes;
                                break;

                            case '\'':
                                inQuotes = !inQuotes;
                                break;

                            case ' ':
                                if(!inQuotes && prevChar !== ' ')
                                {
                                    if(n>0 && n%2 == 0)
                                    {
                                        attributes[attributeName] = attributeValue;
                                        attributeName = "";
                                        attributeValue = "";
                                    }
                                    n++;
                                }
                                else
                                {
                                    if(n%2 == 0)
                                    {
                                        attributeValue += char;
                                    }
                                }
                                
                                break;
                            case '=':
                                if(!inQuotes) n++;
                                break;

                            default:

                                if(n == 0)
                                {
                                    name += char;        
                                }
                                else if(n%2 !== 0)
                                {
                                    attributeName += char;
                                }
                                else
                                {
                                    if(inQuotes)
                                    {
                                        attributeValue += char;
                                    }        
                                }
   
                        }
                        prevChar = char;
                    }

                    if(attributeName !== "")
                    {
                        attributes[attributeName] = attributeValue;
                    }


                    let obj = {name,attributes,parent:currentObject,children:[],content:""};
                    objects.push(obj);
                    if(currentObject)
                    {
                        currentObject.children.push(obj);
                    }
                    currentObject = obj;
                    if(currentTag.endsWith('/'))                        //self-closing tag
                    {
                        currentObject = currentObject.parent;
                    }        
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