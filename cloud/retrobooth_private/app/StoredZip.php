<?php
declare(strict_types=1);
/** Portable ZIP STORE writer for already-compressed video. No ZipArchive extension,
 * shell zip binary, external network call, or loading whole videos into RAM.
 * ZIP32 limits are intentionally enforced; large events are split into parts.
 */
final class RetroStoredZip {
    private $out;
    private array $directory=[];
    private bool $closed=false;
    public function __construct(string $path) {
        $this->out=@fopen($path,'xb');
        if(!$this->out)throw new RuntimeException('zip_create_failed');
        chmod($path,0600);
    }
    private function write(string $data): void {
        $offset=0;$size=strlen($data);
        while($offset<$size){$n=fwrite($this->out,substr($data,$offset));if($n===false||$n===0)throw new RuntimeException('zip_write_failed');$offset+=$n;}
    }
    private function addHeader(string $name,int $size,int $crc): void {
        if(!preg_match('#^[A-Za-z0-9._/-]{1,240}$#D',$name)||str_contains($name,'..')||str_starts_with($name,'/'))throw new RuntimeException('zip_invalid_entry');
        if($size<0||$size>268435456||count($this->directory)>=200)throw new RuntimeException('zip_entry_limit');
        $offset=ftell($this->out);if(!is_int($offset)||$offset>0xffffffff)throw new RuntimeException('zip32_limit');
        $this->write(pack('VvvvvvVVVvv',0x04034b50,20,0,0,0,0,$crc,$size,$size,strlen($name),0).$name);
        $this->directory[]=[$name,$crc,$size,$offset];
    }
    public function addBytes(string $name,string $value): void {
        $this->addHeader($name,strlen($value),(int)hexdec(hash('crc32b',$value)));
        $this->write($value);
    }
    public function addFile(string $name,string $path,int $size,string $sha256): void {
        if(!is_file($path)||is_link($path)||filesize($path)!==$size || !hash_equals($sha256,(string)hash_file('sha256',$path)))throw new RuntimeException('source_media_changed');
        $crc=(int)hexdec((string)hash_file('crc32b',$path));
        $input=@fopen($path,'rb');if(!$input)throw new RuntimeException('zip_media_open_failed');
        try {
            $this->addHeader($name,$size,$crc);$remaining=$size;
            while($remaining>0){$chunk=fread($input,min(65536,$remaining));if($chunk===false||$chunk==='')throw new RuntimeException('zip_media_read_failed');$this->write($chunk);$remaining-=strlen($chunk);}
        }finally{fclose($input);}
    }
    public function finish(): void {
        if($this->closed)return;
        $cdOffset=ftell($this->out);if(!is_int($cdOffset)||$cdOffset>0xffffffff)throw new RuntimeException('zip32_limit');
        foreach($this->directory as [$name,$crc,$size,$offset]){
            $this->write(pack('VvvvvvvVVVvvvvvVV',0x02014b50,20,20,0,0,0,0,$crc,$size,$size,strlen($name),0,0,0,0,0,$offset).$name);
        }
        $cdSize=ftell($this->out)-$cdOffset;$n=count($this->directory);
        if($cdSize>0xffffffff||$n>65535)throw new RuntimeException('zip32_limit');
        $this->write(pack('VvvvvVVv',0x06054b50,0,0,$n,$n,$cdSize,$cdOffset,0));
        if(!fflush($this->out)||!fsync($this->out))throw new RuntimeException('zip_sync_failed');
        fclose($this->out);$this->closed=true;
    }
    public function __destruct(){if(!$this->closed&&is_resource($this->out))fclose($this->out);}
}
