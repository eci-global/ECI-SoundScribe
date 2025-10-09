# PowerShell script to get user email addresses from Azure AD
# Install Azure AD module if not already installed
try {
    Import-Module AzureAD -ErrorAction Stop
    Write-Host "Azure AD module loaded successfully"
} catch {
    Write-Host "Installing Azure AD module..."
    Install-Module -Name AzureAD -Force -AllowClobber
    Import-Module AzureAD
}

# Connect to Azure AD
Write-Host "Connecting to Azure AD..."
Connect-AzureAD

# List of users to search for
$userNames = @(
    "Allan Gulley",
    "Adam Neftzer", 
    "Cindy Jostworth",
    "Jayne Luckett",
    "Lisa Hance",
    "Parnel Ahamed",
    "Jamee Hutchinson",
    "Jordan Shankle",
    "Diego Chavez",
    "Patrick Love",
    "Shea Regondola",
    "Adam Smith",
    "Abraham Escalona",
    "Hector Monreal",
    "Michael Tristan",
    "Kayla Lay",
    "Benjamin Raja",
    "Ryan Cannon",
    "Joshua Trinkle",
    "Ray Sullivan",
    "Yohance Haynes",
    "Milan Jandu",
    "Danny Gonzalez",
    "Raquel Ireifej",
    "Grace Burkes",
    "Andrew Sherley",
    "Lucan Lubore",
    "Jonathan Palau",
    "Aidee Barron",
    "Albert van de Kieft",
    "Alessandro Casagrande",
    "Alisa Gattis",
    "Alison Alley",
    "Amanda Parks",
    "AJ Roland",
    "Amy Austino",
    "Andrew Larson",
    "Andrew Miller",
    "Angela Loftus",
    "Angelica Martinez",
    "Anna Phillips",
    "Anthony Benetti",
    "Anton Hendrik Wilhelmus Magg",
    "Antonette Dusenbery",
    "Armando Velez",
    "Arnetta Barksdale",
    "Ashish Sharma",
    "Ashlee Ware",
    "Auguste Coenraad Leurink",
    "Barbara Grant",
    "Bethany Brown",
    "Brenda Morse",
    "Brent Bell",
    "Brian DenBleyker",
    "Brian Holder",
    "Brian Miller",
    "Brian Schoonbeek",
    "Brittany Gonzales",
    "Bruno Duarte",
    "Bryleigh Dean",
    "Cary Bischoff",
    "Casey Boudreaux",
    "Cathy Demontigny",
    "Charles Walter",
    "Cheri Kreegar",
    "Christopher Finch",
    "Christopher Madsen",
    "Ciara Underwood",
    "Corin Noonan",
    "Crystal Randolph",
    "D Ann Boatright",
    "Daan Frerichs",
    "Daniel Murphy",
    "Daniel Owen",
    "Danny Indefrey",
    "David Bosa",
    "David Furtado",
    "David Hernandez",
    "David Quinan",
    "Deborah Gray",
    "Deborah Schaafsma",
    "Deborah Williams",
    "Didiek Rullianda",
    "Dominic Gerritsen",
    "Eddy Epe",
    "Edward Pike",
    "Elizabeth Apanovitch",
    "Ellen Miller",
    "Emelia Joyner",
    "Emilio Rivera",
    "Erin Willemsen",
    "Ferry Jansen",
    "Frank Langeslag",
    "Franklin Eller",
    "Fredrick Luther",
    "Gemma Klemm",
    "Gretchen Zedik",
    "Harmen Groothedde",
    "Heather Lopez",
    "Hendrikus Evert Veenendaal",
    "Hideki Sumi",
    "Ian Irving-Smith",
    "Jacob Cawley",
    "Janardhan Krishnaraj",
    "Jason Elkins",
    "Jasper van Dijk",
    "Jenell DeLeon",
    "Jennifer Kobus",
    "Jennifer Mulligan",
    "Jenniffer Terrell",
    "Jermaine Chavis",
    "Ji Yong Long",
    "Joe Tijerina",
    "Johannes Lambertus Louis Theodorus van der Hijden",
    "Johannes Mulder",
    "Johannes Rik Pieper",
    "John Clarke",
    "John Clayton",
    "John Harbourt",
    "John Harris",
    "Jordan Lindorff",
    "Jose Diaz Heredia",
    "Journey Coleman",
    "Kathryn Percival",
    "Katie McAlpine",
    "Kelly Salmon",
    "Kelsi Graham",
    "Kenen Rogers",
    "Kevin Kropff",
    "Kevin Wartman",
    "Kevin Wright",
    "Kimberly Blesener",
    "Kimberly White",
    "Kristy Adriana Petra Meijer",
    "Kyle Murrell",
    "Lakin Miller",
    "Laraib Rameez",
    "Laura McKay",
    "Laurens Hazelaar",
    "Lesley Pete",
    "Levi Spencer",
    "Lewis Rymond",
    "Liam Cadle",
    "Linda Montagnon",
    "Lorenzo Santos",
    "Lucas Moyer",
    "Luis Guardado",
    "Luke White",
    "Marc Schneider",
    "Marie Steck",
    "Marinus Hendrik Kuiper",
    "Mark Barnes",
    "Mark Williams",
    "Markwin Petrus",
    "Martha Freed",
    "Martijn Veenstra",
    "Mary Dixon",
    "Mary Sosa",
    "Matthew Daly",
    "Matthew McKinney",
    "Matthew Pistner",
    "Michael Garten",
    "Michael Hamilton",
    "Michael Johnson",
    "Michael Nicholson",
    "Michael Rawson",
    "Michael Woods",
    "Michel Theodorus Johannes Dijkers",
    "Miles Ingram-Jolley",
    "Miranda Orange",
    "Miriam Fulkerson",
    "Mitchell Ramsay",
    "Mohan De Silva",
    "Nasrun Hamdan",
    "Natalie Newman",
    "Nick Syx",
    "Norma Mooney",
    "Pascal Heijdelberger",
    "Paul James",
    "Paul Orsulic",
    "Pavithra Sowjanya Sugumar Sasikala",
    "Peter Pagano",
    "Quinn Baldrige",
    "Rachel Alexander De Gallo",
    "Rachel Foulk",
    "Ray Mangum",
    "Reginald Carson",
    "Remco Gerardus Albertus Mulder",
    "Rhiann Jaffray",
    "Rick Letschert",
    "Robin Parker",
    "Rodney Roeber",
    "Rosanne Foradori",
    "Roy Stanley",
    "Ryan Shute",
    "Samantha Plunkett",
    "Sandra Kent",
    "Scott Braccia",
    "Scott Hollis",
    "Scott Robinson",
    "Sebastiaan Dicus Ferdinand Laros",
    "Shane Welter",
    "Sharon Cook",
    "Shayna McElwee",
    "Sheri Stiles",
    "Sherry Del Bando",
    "Simone van den Top",
    "Souad Sel-lam Ben Salah",
    "Stephanie Crane",
    "Stephen Honeywood",
    "Stephen Thompson",
    "Suhasini Solapur",
    "Sylvia Gines",
    "Takisha Barnett",
    "Tammy Mann",
    "Tanya Donnelly",
    "Taylor Trotter",
    "Thin Yi",
    "Timothy Mccormack",
    "Timothy Withers",
    "Travis Cox",
    "Trond Skognes",
    "Trudy Greygoose",
    "Tyler Nevois",
    "Tyler Ruterbush",
    "Virginia Kite",
    "Vishal Tanna",
    "Vivian Bartkus",
    "Wijbo Jacobus Oosterhoff",
    "William Alexander van de Geest",
    "Wim Faas",
    "Yazmin Munson",
    "Yuen Yi Wong",
    "Twan Dijks",
    "Daniel Hilhorst",
    "Jackson Tomei",
    "Ryan Doran",
    "James Tippett",
    "Pankaj Gulati",
    "Subhashree Mathivanan",
    "Joel Philip Louis",
    "Bernardo Gedanken",
    "Chand Fazal"
)

Write-Host "`nSearching for user email addresses..."
Write-Host "================================================"

# Search for each user and get their email
$foundUsers = @()
$notFoundUsers = @()

foreach ($userName in $userNames) {
    try {
        # Try exact match first
        $users = Get-AzureADUser -Filter "DisplayName eq '$userName'" -All $true
        if (-not $users) {
            # Try partial match
            $users = Get-AzureADUser -Filter "startswith(DisplayName,'$userName')" -All $true
        }
        
        if ($users) {
            foreach ($user in $users) {
                $foundUsers += [PSCustomObject]@{
                    Name = $user.DisplayName
                    Email = $user.UserPrincipalName
                }
                Write-Host "✓ $($user.DisplayName) - $($user.UserPrincipalName)"
            }
        } else {
            $notFoundUsers += $userName
            Write-Host "✗ $userName - Not found"
        }
    } catch {
        Write-Host "✗ $userName - Error: $($_.Exception.Message)"
        $notFoundUsers += $userName
    }
}

Write-Host "`n================================================"
Write-Host "SUMMARY"
Write-Host "================================================"
Write-Host "Found: $($foundUsers.Count) users"
Write-Host "Not found: $($notFoundUsers.Count) users"

if ($foundUsers.Count -gt 0) {
    Write-Host "`nFOUND USERS:"
    Write-Host "============="
    $foundUsers | Format-Table -AutoSize
}

if ($notFoundUsers.Count -gt 0) {
    Write-Host "`nNOT FOUND:"
    Write-Host "==========="
    $notFoundUsers | ForEach-Object { Write-Host "  - $_" }
}

# Export to CSV
$foundUsers | Export-Csv -Path "C:\Projects\ECI-SoundScribe\user-emails.csv" -NoTypeInformation
Write-Host "`nResults exported to: C:\Projects\ECI-SoundScribe\user-emails.csv"
