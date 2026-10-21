// 13-10-2026

import * as fs from 'fs';
import * as path from 'path';

export interface TestDataRow{
    [key: string] : string;
}

export function readCSV(filepath : string) : TestDataRow[]{
    let fullPath = path.resolve(filepath);
    let content = fs.readFileSync(fullPath, 'utf-8');
    let lines = content.trim().split("\n");

    //First line is header
    let headers = lines[0].split(",");

    //Remaing lines are data
    let data : TestDataRow[] = [];
    for (let i=1;i<lines.length;i++)
    {
        let values = lines[i].split(",");
        let row : TestDataRow = {};
        for(let j=0;j<headers.length;j++)
        {
            row[headers[j].trim()] = values[j]?.trim() || "";
        }
        data.push(row);
    }
    return data;
}