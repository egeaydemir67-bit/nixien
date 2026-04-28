require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');

// --- 7/24 UPTIME SUNUCUSU ---
const app = express();
app.get('/', (req, res) => {
    res.send('Bot 7/24 Aktif ve Çalışıyor!');
});
// Render gibi sistemler otomatik port atar, yoksa 3000 kullanır.
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Uptime sunucusu ${port} portunda başlatıldı.`);
});

// --- MONGODB BAĞLANTISI ---
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB veritabanına başarıyla bağlanıldı kanka!");
}).catch((err) => {
    console.log("MongoDB bağlantı hatası:", err);
});

// --- DİSCORD BOT ALTYAPISI ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// Ayarlar ve ID'ler
const config = {
    kanallar: {
        basvuruKanal: "1497272887122460772",
        onayKanal: "1498759345394159716"
    },
    roller: {
        yetAlimSorumlusu: "1498759548562047179",
        yetAlimLideri: "1498760303750545528"
    },
    verilecekYetkiler: [
        { label: 'Stajer', value: '1492671580239822888', description: 'Stajer yetkisi verir.' },
        { label: 'Sicil Sorumlusu', value: '1493896995897872386', description: 'Sicil Sorumlusu yetkisi verir.' },
        { label: 'Public Sorumlusu', value: '1492674773132640406', description: 'Public Sorumlusu yetkisi verir.' },
        { label: 'Chat Sorumlusu', value: '1492679768997363733', description: 'Chat Sorumlusu yetkisi verir.' },
        { label: 'Kayıt Sorumlusu', value: '1493595071466176692', description: 'Kayıt Sorumlusu yetkisi verir.' },
        { label: 'Ban Sorumlusu', value: '1492974570909597727', description: 'Ban Sorumlusu yetkisi verir.' },
        { label: 'Yet Alım Sorumlusu', value: '1498759548562047179', description: 'Sadece Liderler verebilir!' }
    ]
};

client.once('ready', async () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);

    const kanal = client.channels.cache.get(config.kanallar.basvuruKanal);
    if (!kanal) return console.log("Başvuru kanalı bulunamadı, ID'yi kontrol et.");

    const mesajlar = await kanal.messages.fetch({ limit: 10 });
    const botMesajiVarMi = mesajlar.find(m => m.author.id === client.user.id && m.components.length > 0);

    if (!botMesajiVarMi) {
        const embed = new EmbedBuilder()
            .setTitle('🌟 Yetkili Başvurusu')
            .setDescription('Aramıza katılmak ve yetkili olmak için aşağıdaki butona tıklayarak formu doldurabilirsin. Lütfen sorulara dürüst cevap ver.')
            .setColor('Blue');

        const buton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('basvuru_yap')
                .setLabel('Başvuru Yap')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        await kanal.send({ embeds: [embed], components: [buton] });
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'basvuru_yap') {
        const modal = new ModalBuilder()
            .setCustomId('basvuru_formu')
            .setTitle('Yetkili Başvuru Formu');

        const isimYas = new TextInputBuilder().setCustomId('isim_yas').setLabel('İsim ve Yaşınız?').setStyle(TextInputStyle.Short).setRequired(true);
        const aktiflik = new TextInputBuilder().setCustomId('aktiflik').setLabel('Günlük Aktiflik Süreniz?').setStyle(TextInputStyle.Short).setRequired(true);
        const tecrube = new TextInputBuilder().setCustomId('tecrube').setLabel('Daha Önceki Tecrübeleriniz?').setStyle(TextInputStyle.Paragraph).setRequired(true);
        const nedenBiz = new TextInputBuilder().setCustomId('neden_biz').setLabel('Neden Sizi Seçmeliyiz?').setStyle(TextInputStyle.Paragraph).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(isimYas),
            new ActionRowBuilder().addComponents(aktiflik),
            new ActionRowBuilder().addComponents(tecrube),
            new ActionRowBuilder().addComponents(nedenBiz)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'basvuru_formu') {
        const isimYas = interaction.fields.getTextInputValue('isim_yas');
        const aktiflik = interaction.fields.getTextInputValue('aktiflik');
        const tecrube = interaction.fields.getTextInputValue('tecrube');
        const nedenBiz = interaction.fields.getTextInputValue('neden_biz');

        const logKanal = client.channels.cache.get(config.kanallar.onayKanal);
        
        const embed = new EmbedBuilder()
            .setTitle('Yeni Yetkili Başvurusu Geldi!')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${interaction.user} (${interaction.user.id})` },
                { name: '📛 İsim & Yaş', value: isimYas },
                { name: '⏱️ Aktiflik Süresi', value: aktiflik },
                { name: '📚 Tecrübeler', value: tecrube },
                { name: '❓ Neden Biz?', value: nedenBiz }
            )
            .setColor('Yellow')
            .setTimestamp();

        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`onayla_${interaction.user.id}`).setLabel('Kabul Et').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reddet_${interaction.user.id}`).setLabel('Reddet').setStyle(ButtonStyle.Danger)
        );

        await logKanal.send({ content: `<@&${config.roller.yetAlimSorumlusu}> | <@&${config.roller.yetAlimLideri}>`, embeds: [embed], components: [butonlar] });
        await interaction.reply({ content: '✅ Başvurunuz başarıyla yetkililere iletildi. Sonuç size DM yoluyla bildirilecektir.', ephemeral: true });
    }

    if (interaction.isButton() && (interaction.customId.startsWith('onayla_') || interaction.customId.startsWith('reddet_'))) {
        if (!interaction.member.roles.cache.has(config.roller.yetAlimSorumlusu) && !interaction.member.roles.cache.has(config.roller.yetAlimLideri)) {
            return interaction.reply({ content: '❌ Bu işlemi yapmak için yetkiniz yok!', ephemeral: true });
        }

        const islemTuru = interaction.customId.split('_')[0];
        const basvuranId = interaction.customId.split('_')[1];

        if (islemTuru === 'reddet') {
            const embed = interaction.message.embeds[0];
            const redEmbed = EmbedBuilder.from(embed).setColor('Red').setTitle('❌ Başvuru Reddedildi');
            
            await interaction.message.edit({ embeds: [redEmbed], components: [] });
            await interaction.reply({ content: `<@${basvuranId}> adlı kişinin başvurusu reddedildi.`, ephemeral: true });

            try {
                const user = await client.users.fetch(basvuranId);
                await user.send('Maalesef yetkili başvurunuz **reddedildi**. İlginiz için teşekkür ederiz.');
            } catch (e) {
                console.log("Kullanıcıya DM atılamadı.");
            }
        } 
        else if (islemTuru === 'onayla') {
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`rolsec_${basvuranId}`)
                    .setPlaceholder('Kişiye verilecek yetkiyi seçin...')
                    .addOptions(config.verilecekYetkiler)
            );

            await interaction.reply({ content: '✅ Lütfen bu kullanıcıya verilecek yetkiyi aşağıdaki menüden seçin:', components: [menu], ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('rolsec_')) {
        const basvuranId = interaction.customId.split('_')[1];
        const secilenRolId = interaction.values[0];

        if (secilenRolId === config.roller.yetAlimSorumlusu && !interaction.member.roles.cache.has(config.roller.yetAlimLideri)) {
            return interaction.reply({ content: '❌ "Yet Alım Sorumlusu" rolünü sadece Yet Alım Liderleri verebilir!', ephemeral: true });
        }

        const guildMember = await interaction.guild.members.fetch(basvuranId).catch(() => null);
        if (!guildMember) return interaction.reply({ content: '❌ Kullanıcı sunucuda bulunamadı!', ephemeral: true });

        await guildMember.roles.add(secilenRolId).catch(err => console.log(err));
        const rolAdi = config.verilecekYetkiler.find(r => r.value === secilenRolId).label;

        const basvuruMesaji = await interaction.channel.messages.fetch(interaction.message.reference?.messageId).catch(() => null);
        if (basvuruMesaji) {
            const embed = basvuruMesaji.embeds[0];
            const onayEmbed = EmbedBuilder.from(embed).setColor('Green').setTitle(`✅ Başvuru Onaylandı - ${rolAdi} Verildi`).setFooter({ text: `Onaylayan: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
            await basvuruMesaji.edit({ embeds: [onayEmbed], components: [] });
        }

        await interaction.update({ content: `✅ İşlem başarılı! <@${basvuranId}> adlı kişiye <@&${secilenRolId}> rolü verildi.`, components: [] });

        try {
            await guildMember.send(`Tebrikler! Sunucumuzdaki yetkili başvurunuz onaylandı ve **${rolAdi}** rolüne terfi ettirildiniz. Aramıza hoş geldin! 🎉`);
        } catch (e) {
            console.log("Kullanıcıya DM atılamadı.");
        }
    }
});

// TOKEN ARTIK .ENV DOSYASINDAN ÇEKİLİYOR
client.login(process.env.TOKEN);
