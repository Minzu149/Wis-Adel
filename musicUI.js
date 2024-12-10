const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class MusicUI {
    static controlPanelMessage = null;

    static createMusicControlEmbed(songInfo = null) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Bảng Điều Khiển Nhạc')
            .setDescription(songInfo ? 
                `Đang Phát: ${songInfo}\n\nSử dụng các nút bên dưới để điều khiển!` :
                'Không có bài hát nào đang phát.\nSử dụng các nút bên dưới hoặc gõ !play [tên bài hát] để bắt đầu!')
            .setTimestamp();
        
        return embed;
    }

    static createMusicControls() {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('play_pause')
                    .setLabel('⏯️ Phát/Tạm Dừng')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('⏭️ Bỏ Qua')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('stop')
                    .setLabel('⏹️ Dừng')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('queue')
                    .setLabel('📋 Danh Sách')
                    .setStyle(ButtonStyle.Success)
            );

        return row;
    }

    static async sendMusicControlPanel(channel) {
        const embed = this.createMusicControlEmbed();
        const row = this.createMusicControls();

        // Delete old control panel if it exists
        try {
            if (this.controlPanelMessage) {
                await this.controlPanelMessage.delete().catch(() => {});
            }
        } catch (error) {
            console.error('Error deleting old control panel:', error);
        }

        // Send new control panel
        this.controlPanelMessage = await channel.send({
            embeds: [embed],
            components: [row]
        });

        return this.controlPanelMessage;
    }

    static async updateMusicControlPanel(songInfo = null) {
        const embed = this.createMusicControlEmbed(songInfo);
        const row = this.createMusicControls();
        const channel = this.controlPanelMessage?.channel;

        try {
            // Luôn xóa control panel cũ
            if (this.controlPanelMessage) {
                await this.controlPanelMessage.delete().catch(() => {});
            }

            // Nếu có channel, tạo control panel mới
            if (channel) {
                // Đợi 500ms để đảm bảo các tin nhắn khác đã được gửi
                await new Promise(resolve => setTimeout(resolve, 500));
                
                this.controlPanelMessage = await channel.send({
                    embeds: [embed],
                    components: [row]
                });
            }
        } catch (error) {
            console.error('Error updating control panel:', error);
            if (channel) {
                await this.sendMusicControlPanel(channel);
            }
        }
    }

    static async showQueue(channel, queue) {
        if (!queue || !queue.songs.length) {
            return channel.send('Không có bài hát nào trong danh sách chờ!');
        }

        const queueString = queue.songs
            .map((song, index) => {
                return `${index === 0 ? '🎵 Đang phát' : `${index}.`} ${song.name} - \`${song.formattedDuration}\``;
            })
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📋 Danh Sách Phát')
            .setDescription(queueString)
            .setTimestamp();

        return channel.send({ embeds: [embed] });
    }
}

module.exports = MusicUI;
