class Helpers {
  csvToArr(stringVal, splitter) {
    const [keys, ...rest] = stringVal
      .trim()
      .split("\n")
      .map((item) => item.split(splitter));

    const formedArr = rest.map((item) => {
      const object = {};
      keys.forEach((key, index) => (object[key] = item.at(index)));
      return object;
    });
    return formedArr;
  }

  arrayToCSV(data) {
    const csv = [];

    // Get the headers from the first object in the array
    const headers = Object.keys(data[0]);
    csv.push(headers.join(','));

    // Loop through the array and convert each object to a CSV line
    data.forEach(obj => {
      const line = headers.map(header => obj[header]).join(',');
      csv.push(line);
    });

    // Join the array of CSV lines with line breaks
    return csv.join('\n');
  }
}