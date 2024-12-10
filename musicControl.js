// musicControl.js
const MusicUI = require('./musicUI');
const { joinVoiceChannel } = require('@discordjs/voice');


let distube = null;
let currentTrack = null;
let isPlaying = false;

function init(distubeInstance) {
    distube = distubeInstance;
}

async function play(message, query) {
    console.log('=== START PLAY FUNCTION ===');
    console.log('Query:', query);
    
    if (!message.member.voice.channel) {
        console.log('User not in voice channel');
        message.channel.send('Bạn cần vào một kênh voice để sử dụng lệnh này!');
        return;
    }

    try {
        console.log('Checking voice connection...');
        const botVoiceConnection = message.guild.members.me.voice.channel;
        console.log('Bot voice connection:', botVoiceConnection?.name || 'Not connected');
        
        const queue = distube.getQueue(message.guildId);
        console.log('Current queue:', queue ? `${queue.songs.length} songs` : 'No queue');

        if (botVoiceConnection && botVoiceConnection.id !== message.member.voice.channel.id) {
            console.log('Bot in different voice channel');
            return message.channel.send('Bot đang phát nhạc ở kênh voice khác!');
        }

        console.log('Sending processing message...');
        const processingMsg = await message.channel.send('🔄 Đang xử lý yêu cầu...');

        try {
            console.log('Attempting to play...');
            console.log('Voice channel:', message.member.voice.channel.name);
            
            // Remove any playlist parameters from the URL
            const cleanUrl = query.split('&list=')[0];
            console.log('Clean URL:', cleanUrl);

            // Phát nhạc với cấu hình DisTube
            await distube.play(
                message.member.voice.channel,
                cleanUrl,
                {
                    member: message.member,
                    textChannel: message.channel,
                    message,
                    ytdlOptions: {
                        quality: 'highestaudio',
                        highWaterMark: 1 << 26, // Tăng buffer để đảm bảo stream ổn định
                        filter: 'audioonly',
                        bitrate: 384000, // Tăng bitrate lên mức cao nhất có thể
                        opusEncoded: true,
                        encoderArgs: [
                            // Dynamic range processor tinh chỉnh cho âm thanh sống động
                            'compand=attacks=0.05:decays=0.3:points=-70/-70|-35/-35|-20/-15|0/-10:gain=6',
                            
                            // Bass enhancement với nhiều chi tiết hơn
                            'bass=g=7:f=120:w=0.7',
                            
                            // EQ chi tiết cho từng dải tần
                            'equalizer=f=30:width_type=h:width=30:g=4',   // Sub-bass
                            'equalizer=f=80:width_type=h:width=40:g=5',   // Deep bass
                            'equalizer=f=150:width_type=h:width=50:g=3',  // Bass
                            'equalizer=f=400:width_type=h:width=100:g=2', // Low-mids
                            'equalizer=f=2000:width_type=h:width=100:g=3', // Mids
                            'equalizer=f=5000:width_type=h:width=100:g=4', // High-mids
                            'equalizer=f=10000:width_type=h:width=100:g=5', // Highs
                            
                            // Tăng độ rõ và chi tiết
                            'clarity=gain=3',
                            'highpass=f=20',  // Lọc tạp âm tần số thấp
                            
                            // Tăng cường dải hài âm
                            'treble=g=3:f=10000:w=0.8',
                            
                            // Mở rộng không gian âm thanh
                            'stereowiden=level=3',
                            
                            // Tăng cường động năng
                            'dynaudnorm=f=200:g=15:p=0.7',
                            
                            // Normalize với headroom tốt hơn
                            'loudnorm=I=-13:TP=-0.5:LRA=12'
                        ],
                        liveBuffer: 50000, // Tăng buffer để xử lý âm thanh tốt hơn
                        dlChunkSize: 6144, // Tăng chunk size cho stream ổn định
                    }
                }
            );
            
            
            currentTrack = query;
            isPlaying = true;

            console.log('Play command sent successfully');
            await processingMsg.delete().catch(e => console.error('Error deleting message:', e));
            
        } catch (error) {
            console.error('Inner play error:', error);
            console.log('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            await processingMsg.delete().catch(e => console.error('Error deleting message:', e));
            message.channel.send(`Không thể phát nhạc: ${error.message}`);
            
            if (botVoiceConnection) {
                console.log('Attempting to leave voice channel due to error');
                await distube.voices.leave(message.guild);
            }
        }
    } catch (error) {
        console.error('Outer play error:', error);
        message.channel.send('Có lỗi xảy ra khi xử lý yêu cầu phát nhạc.');
    }
    console.log('=== END PLAY FUNCTION ===');
}

function pause(message) {
    try {
        const queue = distube.getQueue(message.guildId);
        if (!queue) {
            message.channel.send('Không có bài hát nào đang phát!');
            return;
        }
        if (queue.paused) {
            message.channel.send('Nhạc đã được tạm dừng rồi!');
            return;
        }
        queue.pause();
        isPlaying = false;
        MusicUI.updateMusicControlPanel(`${currentTrack} (Đã tạm dừng)`);
        message.channel.send('Đã tạm dừng nhạc!');
    } catch (error) {
        console.error('Error pausing:', error);
        message.channel.send('Có lỗi xảy ra khi tạm dừng nhạc!');
    }
}

function resume(message) {
    try {
        const queue = distube.getQueue(message.guildId);
        if (!queue) {
            message.channel.send('Không có bài hát nào trong hàng đợi!');
            return;
        }
        if (!queue.paused) {
            message.channel.send('Nhạc đang phát rồi!');
            return;
        }
        queue.resume();
        isPlaying = true;
        MusicUI.updateMusicControlPanel(currentTrack);
        message.channel.send('Đã tiếp tục phát nhạc!');
    } catch (error) {
        console.error('Error resuming:', error);
        message.channel.send('Có lỗi xảy ra khi tiếp tục phát nhạc!');
    }
}

function skip(message) {
    if (distube) {
        try {
            const queue = distube.getQueue(message);
            if (!queue) {
                message.channel.send('Không có bài hát nào đang phát!');
                return;
            }
            if (queue.songs.length <= 1) {
                message.channel.send('Không có bài hát tiếp theo trong hàng đợi!');
                return;
            }
            distube.skip(message);
            MusicUI.updateMusicControlPanel('Đang chuyển bài...');
        } catch (error) {
            console.error('Error skipping track:', error);
            message.channel.send('Có lỗi xảy ra khi chuyển bài!');
        }
    }
}

function stop(message) {
    if (distube) {
        distube.stop(message);
        isPlaying = false;
        currentTrack = null;
        MusicUI.updateMusicControlPanel();
        message.channel.send('Đã dừng phát nhạc!');
    }
}

async function handleButtonInteraction(interaction) {
    if (!interaction.member.voice.channel) {
        await interaction.reply({ content: 'Bạn cần vào một kênh voice để sử dụng lệnh này!', ephemeral: true });
        return;
    }

    // Defer the update first
    await interaction.deferUpdate();

    switch (interaction.customId) {
        case 'play_pause':
            if (isPlaying) {
                pause(interaction);
            } else {
                resume(interaction);
            }
            break;
        case 'skip':
            skip(interaction);
            break;
        case 'stop':
            stop(interaction);
            break;
            case 'queue':
                const queue = distube.getQueue(interaction.guildId);
                await MusicUI.showQueue(interaction.channel, queue);
                break;
    }
}

// Export functions for use in other modules
module.exports = { 
    init, 
    play, 
    pause, 
    resume, 
    skip, 
    stop,
    handleButtonInteraction 
};
