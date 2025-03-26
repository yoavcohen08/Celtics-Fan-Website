const fs = require('fs');
const https = require('https');
const path = require('path');

// Create the teams directory if it doesn't exist
const teamsDir = path.join(__dirname, 'images', 'teams');
if (!fs.existsSync(teamsDir)) {
  fs.mkdirSync(teamsDir, { recursive: true });
}

// Team logo URLs
const teamLogos = {
  'celtics': 'https://cdn.nba.com/logos/nba/1610612738/global/L/logo.svg',
  'knicks': 'https://cdn.nba.com/logos/nba/1610612752/global/L/logo.svg',
  'wizards': 'https://cdn.nba.com/logos/nba/1610612764/global/L/logo.svg',
  'pistons': 'https://cdn.nba.com/logos/nba/1610612765/global/L/logo.svg',
  'pacers': 'https://cdn.nba.com/logos/nba/1610612754/global/L/logo.svg',
  '76ers': 'https://cdn.nba.com/logos/nba/1610612755/global/L/logo.svg',
  'hornets': 'https://cdn.nba.com/logos/nba/1610612766/global/L/logo.svg',
  'hawks': 'https://cdn.nba.com/logos/nba/1610612737/global/L/logo.svg',
  'warriors': 'https://cdn.nba.com/logos/nba/1610612744/global/L/logo.svg',
  'nets': 'https://cdn.nba.com/logos/nba/1610612751/global/L/logo.svg',
  'heat': 'https://cdn.nba.com/logos/nba/1610612748/global/L/logo.svg',
  'bucks': 'https://cdn.nba.com/logos/nba/1610612749/global/L/logo.svg',
  'magic': 'https://cdn.nba.com/logos/nba/1610612753/global/L/logo.svg',
  'lakers': 'https://cdn.nba.com/logos/nba/1610612747/global/L/logo.svg',
  'mavericks': 'https://cdn.nba.com/logos/nba/1610612742/global/L/logo.svg',
  'kings': 'https://cdn.nba.com/logos/nba/1610612758/global/L/logo.svg',
  'suns': 'https://cdn.nba.com/logos/nba/1610612756/global/L/logo.svg',
  'spurs': 'https://cdn.nba.com/logos/nba/1610612759/global/L/logo.svg',
  'grizzlies': 'https://cdn.nba.com/logos/nba/1610612763/global/L/logo.svg'
};

// Download each logo
for (const [team, url] of Object.entries(teamLogos)) {
  const filePath = path.join(teamsDir, `${team}.png`);
  
  console.log(`Downloading ${team} logo from ${url}`);
  
  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      console.error(`Failed to download ${team} logo: ${response.statusCode}`);
      return;
    }
    
    const fileStream = fs.createWriteStream(filePath);
    response.pipe(fileStream);
    
    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded ${team} logo to ${filePath}`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${team} logo: ${err.message}`);
  });
} 