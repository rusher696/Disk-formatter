const { execSync, accessSync, constants } = require('fs');
const { writeFileSync, unlinkSync } = require('fs');
const { parse } = require('json');

function killdisk(drive, formatType = "format:ntfs quick") {
    try {
        accessSync(drive, constants.W_OK | constants.R_OK | constants.X_OK); // Check disk permissions
    } catch (err) {
        console.log("Please grant full permissions first before running.");
        return;
    }

    function helper(type) {
        const parts = type.trim().split(":"); // Get parts
        const [arg1, arg2, arg3] = parts.length === 3 ? [parts[0], parts[1], parts[2]] : [parts[0], parts[1], null];
        return [arg1, arg2, arg3];
    }

    const [type, filler, fillmb] = helper(formatType);
    let fs;
    if (type === "format") fs = filler;

    const powershellCmd = `powershell -Command "Get-Partition -DriveLetter '${drive[0]}' | Get-Disk | Select-Object Number | ConvertTo-Json"`;
    const result = execSync(powershellCmd, { encoding: 'utf-8' });
    const data = JSON.parse(result);

    // Fetch disk number
    let disknum;
    if (Array.isArray(data)) {
        disknum = data[0]?.Number || null;
    } else {
        disknum = data.Number;
    }

    if (!disknum) {
        console.log("Could not find disk number.");
        return;
    }

    if (type.toLowerCase().trim() === "format") {
        console.log(`Found disk ${disknum} for drive ${drive}`);
        const dpart = `
         select disk ${disknum}
         clean
         create partition primary
         format fs=${fs}
         assign
         exit
        `; // Create diskpart command

        writeFileSync(`disk${disknum}.txt`, dpart); // Create a file to write the command into for diskpart
        execSync(`diskpart /s disk${disknum}.txt`); // Run diskpart file
        console.log(`Formatted disk ${disknum}/${drive} successfully.`);
        unlinkSync(`disk${disknum}.txt`);
    } else if (type.toLowerCase().trim().startsWith("fill")) {
        console.log(`Found disk ${disknum} for drive ${drive}`);
        const disk = require('fs').createWriteStream(`\\\\.\\PhysicalDrive${disknum}`, { flags: 'w' });
        const fillerBuffer = Buffer.from(filler, 'utf-8');
        for (let i = 0; i < parseInt(fillmb); i++) {
            disk.write(fillerBuffer.repeat(1024 * 1024 / fillerBuffer.length));
        }
        disk.end();
    }
}
