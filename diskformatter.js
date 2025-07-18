const { execSync, accessSync, constants } = require('fs');
const { spawnSync } = require('child_process');

function killdisk(drive, fs = "ntfs quick", type = "format", fillmb = 1024) {
    try {
        accessSync(drive, constants.W_OK | constants.R_OK | constants.X_OK); // Check disk permissions
    } catch (err) {
        console.log("Please grant full permissions first before running.");
        return;
    }

    const powershellcmd = ["powershell", "-Command", `Get-Partition -DriveLetter '${drive[0]}' | Get-Disk | Select-Object Number | ConvertTo-Json`]; // cmdline args for powershell
    const result = execSync(powershellcmd.join(' '), { encoding: 'utf-8' });
    const data = JSON.parse(result);

    // Fetch disk number
    let disknum;
    if (Array.isArray(data)) {
        disknum = data[0] ? data[0].Number : null;
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

        require('fs').writeFileSync(`disk${disknum}.txt`, dpart); // Create a file to write the command into for diskpart
        execSync(`diskpart /s disk${disknum}.txt`); // Run diskpart file
        console.log(`Formatted disk ${disknum}/${drive} successfully.`);
        require('fs').unlinkSync(`disk${disknum}.txt`);
    } else if (type.toLowerCase().trim().startsWith("fill")) {
        console.log(`Found disk ${disknum} for drive ${drive}`);
        const filler = type.split(' ')[1]; // Get the second word
        const disk = require('fs').createWriteStream(`\\\\.\\PhysicalDrive${disknum}`, { flags: 'w' });
        const buffer = Buffer.from(filler, 'utf-8');

        for (let i = 0; i < fillmb; i++) {
            disk.write(Buffer.concat([buffer], 1024 * 1024)); // Write the filler
        }
        disk.end();
    }
}