import os, subprocess, json
def killdisk(drive, fs="ntfs quick", type="format", fillmb=1024):
    if not os.access(drive, os.W_OK) or not os.access(drive, os.R_OK) or not os.access(drive, os.X_OK): # Check disk permissions
        print("Please grant full permissions first before running.")
        return
    powershellcmd = ["powershell", "-Command", f"Get-Partition -DriveLetter '{drive[0]}' | Get-Disk | Select-Object Number | ConvertTo-Json"] # cmdline args for powershell
    result = subprocess.run(powershellcmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    # Fetch disk number
    if isinstance(data, list):
        disknum = data[0]["Number"] if data else None
    else:
        disknum = data["Number"]
    if not disknum:
        print("Could not find disk number.")
        return    
    if type.lower().strip() == "format":
        print(f"Found disk {disknum} for drive {drive}")
        dpart = f"""
         select disk {disknum}
         clean
         create partition primary
         format fs={fs}
         assign
         exit
            """ # Create diskpart command
        with open(f"disk{disknum}.txt", "w") as f: # Create a file to write the command into for diskpart
            f.write(dpart)
        subprocess.run(["diskpart", "/s", f"disk{disknum}.txt"]) # Run diskpart file
        print(f"Formatted disk {disknum}/{drive} successfully.")
        os.remove(f"disk{disknum}.txt")
    elif type.lower().strip().startswith("fill"):
        print(f"Found disk {disknum} for drive {drive}")
        filler = type.split()[1] # Get the second word (e.g. "hello world".split()[0] = "world")
        with open(rf"\\.\PhysicalDrive{disknum}", "wb") as disk:
            filler = filler.encode("utf-8")            
            for _ in range(int(fillmb)):
                disk.write(filler * (1024 * 1024 // len(filler)))
