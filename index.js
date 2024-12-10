require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const ffmpeg = require('ffmpeg-static');



// Thiết lập đường dẫn ffmpeg
const ffmpegPath = ffmpeg;
process.env.FFMPEG_PATH = ffmpegPath;
process.env.PATH = `${process.env.PATH};${require('path').dirname(ffmpegPath)}`;
console.log('FFMPEG Path:', ffmpegPath);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Khởi tạo DisTube với cấu hình mới
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    savePreviousSongs: true,
    nsfw: false,
    plugins: [new YtDlpPlugin()],
    leaveOnEmpty: true,
    leaveOnFinish: false,
    leaveOnStop: false,
    ytdlOptions: {
        quality: 'highestaudio',
        format: 'audioonly',
        liveBuffer: 60000,
        dlChunkSize: 0,
        bitrate: 320,
        filter: 'audioonly',
    }
});

const prefix = 'w';

// Import MusicUI
const MusicUI = require('./musicUI');

// Thêm vào đầu file, sau các import
const BOT_VERSION = '1.0.0';
const DEVELOPER = 'Nguyên Kỷ';
const HELP_MESSAGE = `
🎵 **HƯỚNG DẪN SỬ DỤNG Skadi Music BOT**

**Prefix:** ${prefix}

**Các Lệnh:**
• ${prefix}play <tên bài hát/URL> - Phát nhạc
• ${prefix}pause - Tạm dừng
• ${prefix}resume - Tiếp tục phát
• ${prefix}skip - Bỏ qua bài hiện tại
• ${prefix}stop - Dừng phát nhạc
• ${prefix}info - Xem thông tin bot

**Nút Điều Khiển:**
• ⏯️ - Phát/Tạm dừng
• ⏭️ - Bỏ qua bài hiện tại
• ⏹️ - Dừng phát nhạc
• 📋 - Xem danh sách phát

**Phiên bản:** ${BOT_VERSION}
**Developer:** ${DEVELOPER}

Để sử dụng bot, hãy vào một kênh voice và sử dụng các lệnh trên!
`;

function formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000) % 60;
    const minutes = Math.floor(uptime / (1000 * 60)) % 60;
    const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days} ngày`);
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    if (seconds > 0) parts.push(`${seconds} giây`);

    return parts.join(', ');
}

client.on('ready', async () => {
    console.log(`Bot đã sẵn sàng với tên ${client.user.tag}`);
    
    // Get all guilds the bot is in
    const guilds = client.guilds.cache;
    
    // For each guild, create a control panel in the first text channel
    for (const [_, guild] of guilds) {
        const channel = guild.channels.cache.find(
            channel => channel.type === 0 && channel.permissionsFor(guild.members.me).has('SendMessages')
        );
        
        if (channel) {
            try {
                await MusicUI.sendMusicControlPanel(channel);
                console.log(`Đã tạo bảng điều khiển nhạc trong kênh ${channel.name}`);
            } catch (error) {
                console.error(`Lỗi khi tạo bảng điều khiển trong ${guild.name}:`, error);
            }
        }
    }
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('Bạn cần vào một kênh voice để sử dụng lệnh này!');
        }

        try {
            const query = args.join(' ');
            if (!query) {
                return message.reply('Vui lòng cung cấp bài hát để phát!');
            }
            await musicControl.play(message, query);
        } catch (error) {
            console.error(error);
            message.reply('Có lỗi xảy ra khi phát nhạc!');
        }
    }

    // Other music commands
    switch (command) {
        case 'pause':
            musicControl.pause(message);
            break;
        case 'resume':
            musicControl.resume(message);
            break;
        case 'skip':
            musicControl.skip(message);
            break;
        case 'stop':
            musicControl.stop(message);
            break;
        case 'help':
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🎵 Music Bot - Hướng Dẫn Sử Dụng')
                .setDescription(HELP_MESSAGE)
                .setTimestamp()
                .setFooter({ text: `Version ${BOT_VERSION} • Developed by ${DEVELOPER}` });
            
            message.channel.send({ embeds: [helpEmbed] });
            break;
        case 'info':
        case 'botinfo':
            const infoEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🤖 Thông Tin Bot')
                .addFields(
                    { name: '🏷️ Tên Bot', value: client.user.username, inline: true },
                    { name: '🆔 Bot ID', value: client.user.id, inline: true },
                    { name: '📊 Số Server', value: client.guilds.cache.size.toString(), inline: true },
                    { name: '👨‍💻 Developer', value: DEVELOPER, inline: true },
                    { name: '🔄 Version', value: BOT_VERSION, inline: true },
                    { name: '⏰ Uptime', value: formatUptime(client.uptime), inline: true }
                )
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: `Developed by ${DEVELOPER}` });
            
            message.channel.send({ embeds: [infoEmbed] });
            break;
    }
});

// DisTube event handlers
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

distube
    .on('playSong', async (queue, song) => {
        console.log('Playing song:', {
            name: song.name,
            url: song.url,
            duration: song.duration,
            queue: queue.songs.length
        });
        await queue.textChannel.send(
            `🎵 Đang phát: \`${song.name}\` - \`${song.formattedDuration}\`\nYêu cầu bởi: ${song.user}`
            
        );
        // MusicUI.updateMusicControlPanel();

    })
    .on('addSong', async (queue, song) => {
        console.log('Added song to queue:', {
            name: song.name,
            url: song.url,
            duration: song.duration,
            queueLength: queue.songs.length
        });
        await queue.textChannel.send(
            `✅ Đã thêm \`${song.name}\` vào hàng đợi\nYêu cầu bởi: ${song.user}`
        );
        MusicUI.updateMusicControlPanel();

    })
    .on('error', async (channel, error) => {
        console.error('DisTube error:', error);
        if (channel) {
            try {
                await channel.send(`❌ Lỗi: ${error.message}`);
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }
    })
    .on('disconnect', channel => {
        console.log('Bot disconnected from voice channel');
        if (channel) channel.send('🔌 Bot đã ngắt kết nối khỏi kênh voice');
    })
    .on('empty', channel => {
        console.log('Voice channel is empty');
        if (channel) channel.send('📭 Kênh voice trống - Bot sẽ rời kênh sau 5 phút');
    })
    .on('initQueue', queue => {
        console.log('Initializing queue with settings:', {
            autoplay: queue.autoplay,
            volume: queue.volume,
            filters: queue.filters
        });
        queue.autoplay = false;
        queue.volume = 100;
    })
    .on('searchResult', (message, result) => {
        console.log('Search results:', result.map(song => ({
            name: song.name,
            url: song.url,
            duration: song.duration
        })));
    })
    .on('searchNoResult', message => {
        console.log('No search results found');
        message.channel.send('Không tìm thấy bài hát!');
    })
    .on('searchCancel', message => {
        console.log('Search cancelled');
        message.channel.send('Đã hủy tìm kiếm!');
    })
    .on('searchInvalidAnswer', message => {
        console.log('Invalid search answer received');
        message.channel.send('Câu trả lời không hợp lệ!');
    })
    .on('searchDone', (message, answer, query) => {
        console.log('Search done:', query);
    });

// Import the music control module
const musicControl = require('./musicControl');

// Initialize the music control with DisTube instance
musicControl.init(distube);

// Handle button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    await musicControl.handleButtonInteraction(interaction);
});

client.login(process.env.DISCORD_TOKEN); 